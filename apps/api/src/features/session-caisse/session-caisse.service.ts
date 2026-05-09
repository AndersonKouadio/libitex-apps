import { Injectable } from "@nestjs/common";
import { CashSessionRepository } from "./repositories/cash-session.repository";
import { TicketRepository } from "../vente/repositories/ticket.repository";
import {
  RessourceIntrouvableException,
  SessionCaisseDejaOuverteException,
  SessionCaisseFermeeException,
  TicketsEnCoursException,
} from "../../common/exceptions/metier.exception";
import {
  OuvrirSessionDto, FermerSessionDto, SessionCaisseResponseDto,
  RecapitulatifFermetureDto, ListerSessionsQueryDto,
} from "./dto/session-caisse.dto";
import { PaginatedResponseDto } from "../../common/dto/api-response.dto";

const METHODES = ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER"] as const;
type Methode = typeof METHODES[number];
type FondMap = Record<Methode, number>;

@Injectable()
export class SessionCaisseService {
  constructor(
    private readonly repo: CashSessionRepository,
    private readonly ticketRepo: TicketRepository,
  ) {}

  // --- Ouvrir une session ---

  async ouvrir(
    tenantId: string, cashierId: string, dto: OuvrirSessionDto,
  ): Promise<SessionCaisseResponseDto> {
    const existante = await this.repo.trouverActive(tenantId, cashierId, dto.emplacementId);
    if (existante) throw new SessionCaisseDejaOuverteException();

    const numero = await this.genererNumeroSession(tenantId);
    const fondInitial = this.normaliserFond(dto.fondInitial);

    const session = await this.repo.creer({
      tenantId,
      locationId: dto.emplacementId,
      cashierId,
      sessionNumber: numero,
      openingFloat: fondInitial,
      openingNote: dto.commentaire,
    });

    return this.mapSession(session);
  }

  // --- Session active du caissier sur un emplacement ---

  async obtenirActive(
    tenantId: string, cashierId: string, emplacementId: string,
  ): Promise<SessionCaisseResponseDto | null> {
    const session = await this.repo.trouverActive(tenantId, cashierId, emplacementId);
    if (!session) return null;
    return this.mapSession(session);
  }

  // --- Detail d'une session (avec stats) ---

  async obtenir(tenantId: string, id: string): Promise<SessionCaisseResponseDto> {
    const session = await this.repo.obtenirParId(tenantId, id);
    if (!session) throw new RessourceIntrouvableException("Session caisse", id);
    return this.mapSession(session);
  }

  // --- Recapitulatif avant fermeture (montre tickets en cours + ventilation) ---

  async recapitulatifFermeture(
    tenantId: string, sessionId: string,
  ): Promise<RecapitulatifFermetureDto> {
    const session = await this.repo.obtenirParId(tenantId, sessionId);
    if (!session) throw new RessourceIntrouvableException("Session caisse", sessionId);

    const [enCours, ventilation, sessionMappee] = await Promise.all([
      this.repo.listerTicketsEnCours(sessionId),
      this.repo.calculerVentilationPaiements(sessionId),
      this.mapSession(session),
    ]);

    return {
      session: sessionMappee,
      ticketsEnCours: enCours.map((t) => ({
        id: t.id,
        numeroTicket: t.ticketNumber,
        statut: t.status as "OPEN" | "PARKED",
        total: Number(t.total),
        creeLe: t.createdAt.toISOString(),
      })),
      ventilationPaiements: ventilation.map((v) => ({
        methode: v.method,
        nombre: v.count,
        total: v.total,
      })),
    };
  }

  // --- Fermer une session ---

  async fermer(
    tenantId: string, sessionId: string, dto: FermerSessionDto,
  ): Promise<SessionCaisseResponseDto> {
    const session = await this.repo.obtenirParId(tenantId, sessionId);
    if (!session) throw new RessourceIntrouvableException("Session caisse", sessionId);
    if (session.status === "CLOSED") throw new SessionCaisseFermeeException();

    // Refuser la fermeture s'il reste des tickets OPEN (en cours d'encaissement)
    const enCours = await this.repo.listerTicketsEnCours(sessionId);
    const opens = enCours.filter((t) => t.status === "OPEN");
    if (opens.length > 0) throw new TicketsEnCoursException(opens.length);

    // Theorique = openingFloat + somme paiements par methode
    const ventilation = await this.repo.calculerVentilationPaiements(sessionId);
    const opening = this.normaliserFond(session.openingFloat as Partial<FondMap>);
    const theorique: FondMap = { ...opening };
    for (const v of ventilation) {
      const m = v.method as Methode;
      if (METHODES.includes(m)) theorique[m] = (theorique[m] ?? 0) + v.total;
    }

    const declare = this.normaliserFond(dto.fondFinalDeclare);
    const ecart: FondMap = { CASH: 0, CARD: 0, MOBILE_MONEY: 0, BANK_TRANSFER: 0 };
    for (const m of METHODES) ecart[m] = declare[m] - theorique[m];

    const ferme = await this.repo.fermer(sessionId, {
      closingDeclared: declare,
      closingTheoretical: theorique,
      variance: ecart,
      closingNote: dto.commentaire,
    });

    return this.mapSession(ferme);
  }

  // --- Lister sessions (historique) ---

  async lister(
    tenantId: string, query: ListerSessionsQueryDto,
  ): Promise<PaginatedResponseDto<SessionCaisseResponseDto>> {
    const { data, total } = await this.repo.lister(tenantId, {
      emplacementId: query.emplacementId,
      caissierId: query.caissierId,
      statut: query.statut,
      dateDebut: query.dateDebut,
      dateFin: query.dateFin,
      limit: query.limit,
      offset: query.offset,
    });

    const noms = await this.repo.hydraterNoms(data.map((s) => ({
      locationId: s.locationId, cashierId: s.cashierId,
    })));

    const stats = await Promise.all(
      data.map((s) => this.repo.obtenirStatsSession(s.id)),
    );

    const items = data.map((s, i) => this.mapSessionAvecNoms(s, {
      locationName: noms.locations.get(s.locationId) ?? "—",
      cashierName: noms.cashiers.get(s.cashierId) ?? "—",
      ...stats[i],
    }));

    return PaginatedResponseDto.create(items, total, query.page, query.limit);
  }

  // --- Helpers ---

  private async genererNumeroSession(tenantId: string): Promise<string> {
    const today = new Date();
    const prefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    const count = await this.repo.compterSessionsDuJour(tenantId);
    return `SC-${prefix}-${String(count + 1).padStart(3, "0")}`;
  }

  private normaliserFond(input: Partial<FondMap>): FondMap {
    return {
      CASH: Number(input.CASH ?? 0),
      CARD: Number(input.CARD ?? 0),
      MOBILE_MONEY: Number(input.MOBILE_MONEY ?? 0),
      BANK_TRANSFER: Number(input.BANK_TRANSFER ?? 0),
    };
  }

  private async mapSession(raw: any): Promise<SessionCaisseResponseDto> {
    const noms = await this.repo.hydraterEmplacementEtCaissier(raw.locationId, raw.cashierId);
    const stats = await this.repo.obtenirStatsSession(raw.id);
    return this.mapSessionAvecNoms(raw, {
      locationName: noms.locationName,
      cashierName: noms.cashierName,
      ...stats,
    });
  }

  private mapSessionAvecNoms(raw: any, extra: {
    locationName: string; cashierName: string;
    nombreTickets: number; totalEncaisse: number;
  }): SessionCaisseResponseDto {
    return {
      id: raw.id,
      numeroSession: raw.sessionNumber,
      emplacementId: raw.locationId,
      emplacementNom: extra.locationName,
      caissierId: raw.cashierId,
      caissierNom: extra.cashierName,
      statut: raw.status,
      fondInitial: this.normaliserFond(raw.openingFloat ?? {}),
      fondFinalTheorique: raw.closingTheoretical ? this.normaliserFond(raw.closingTheoretical) : null,
      fondFinalDeclare: raw.closingDeclared ? this.normaliserFond(raw.closingDeclared) : null,
      ecart: raw.variance ? this.normaliserFond(raw.variance) : null,
      commentaireOuverture: raw.openingNote,
      commentaireFermeture: raw.closingNote,
      ouvertA: raw.openedAt?.toISOString?.() ?? raw.openedAt,
      fermeA: raw.closedAt?.toISOString?.() ?? raw.closedAt ?? null,
      nombreTickets: extra.nombreTickets,
      totalEncaisse: extra.totalEncaisse,
    };
  }
}
