import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { FideliteRepository } from "./repositories/fidelite.repository";
import {
  ModifierConfigFideliteDto, ConfigFideliteResponseDto,
  AjusterPointsDto, SoldeFideliteDto, TransactionFideliteDto,
} from "./dto/fidelite.dto";
import { AuditService, AUDIT_ACTIONS } from "../../common/audit/audit.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

@Injectable()
export class FideliteService {
  constructor(
    private readonly repo: FideliteRepository,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async obtenirConfig(tenantId: string): Promise<ConfigFideliteResponseDto> {
    const row = await this.repo.obtenirOuCreerConfig(tenantId);
    return this.mapConfig(row);
  }

  async modifierConfig(
    tenantId: string,
    userId: string,
    dto: ModifierConfigFideliteDto,
  ): Promise<ConfigFideliteResponseDto> {
    // Fix I7 : validation coherence ratios. La valeur d'un point ne doit
    // pas depasser le ratio de gain (sinon le client gagne plus en
    // utilisant qu'en accumulant — boutique perdante).
    // Exemple non valide : earnAmount=100 (1 pt / 100 F dépensé) +
    // redeemValue=200 (1 pt = 200 F de remise) -> le client recupere 2x.
    const ratioGain = dto.ratioGain ?? Number((await this.repo.obtenirOuCreerConfig(tenantId)).earnAmount);
    const valeurPoint = dto.valeurPoint ?? Number((await this.repo.obtenirOuCreerConfig(tenantId)).redeemValue);
    if (valeurPoint > ratioGain) {
      throw new BadRequestException(
        `Configuration suspecte : valeur du point (${valeurPoint} F) > ratio de gain (${ratioGain} F). `
        + "Un client gagnerait plus qu'il ne depense.",
      );
    }

    const avant = await this.repo.obtenirOuCreerConfig(tenantId);
    const data: any = {};
    if (dto.actif !== undefined) data.isActive = dto.actif;
    if (dto.nomProgramme !== undefined) data.programName = dto.nomProgramme;
    if (dto.ratioGain !== undefined) data.earnAmount = dto.ratioGain.toString();
    if (dto.valeurPoint !== undefined) data.redeemValue = dto.valeurPoint.toString();
    if (dto.seuilUtilisation !== undefined) data.minRedeemPoints = dto.seuilUtilisation;
    const row = await this.repo.modifierConfig(tenantId, data);

    // Audit log : tracabilite des modifications de config (sensible :
    // change le ratio impacte tous les futurs gains/utilisations).
    await this.audit.log({
      tenantId, userId,
      action: AUDIT_ACTIONS.FIDELITE_CONFIG_UPDATED,
      entityType: "FIDELITE_CONFIG", entityId: row.id,
      before: this.mapConfig(avant),
      after: this.mapConfig(row),
    });

    // Fix I9 : broadcast pour que /parametres/fidelite et les modals
    // paiement rafraichissent la config en temps reel sur les autres
    // postes.
    this.realtime.emitToTenant(tenantId, "fidelite.changed", { type: "config" });

    return this.mapConfig(row);
  }

  private mapConfig(row: any): ConfigFideliteResponseDto {
    return {
      actif: row.isActive,
      nomProgramme: row.programName,
      ratioGain: Number(row.earnAmount),
      valeurPoint: Number(row.redeemValue),
      seuilUtilisation: Number(row.minRedeemPoints),
    };
  }

  /**
   * Fix C3 + I2 : verifie que customerId appartient au tenant.
   * Centralise pour utiliser dans toutes les methodes publiques.
   */
  private async assertClientTenant(tenantId: string, customerId: string): Promise<void> {
    const ok = await this.repo.clientAppartientTenant(tenantId, customerId);
    if (!ok) {
      throw new ForbiddenException("Client introuvable ou inaccessible");
    }
  }

  /**
   * Appele par VenteService.completerTicket apres la cloture d'un ticket.
   * Si la fidelite est active et le ticket est attache a un client, calcule
   * et credite les points gagnes. Silencieux si tenant != client ou point=0.
   *
   * Fix C4 : si la transaction existe deja (replay), on degrade
   * silencieusement (idempotence).
   */
  async crediterDepuisTicket(
    tenantId: string,
    customerId: string,
    ticketId: string,
    montantTotal: number,
  ): Promise<void> {
    const config = await this.repo.obtenirOuCreerConfig(tenantId);
    if (!config.isActive) return;
    const ratio = Number(config.earnAmount);
    if (ratio <= 0) return;
    const points = Math.floor(montantTotal / ratio);
    if (points <= 0) return;
    try {
      await this.repo.ajouterTransaction({
        tenantId,
        customerId,
        points,
        transactionType: "EARN",
        ticketId,
      });
      // Fix I9 : broadcast pour rafraichir le solde sur les autres postes.
      this.realtime.emitToTenant(tenantId, "fidelite.changed", {
        type: "balance", customerId,
      });
    } catch (err) {
      if (this.repo.estViolationUniqueLoyalty(err)) return;
      throw err;
    }
  }

  /**
   * Debit/credit lie a un ticket (paiement avec points = REDEEM negatif).
   *
   * Fix I3 : verifie le solde avant le debit pour eviter solde negatif.
   * Fix C4 : idempotent sur (tenant, customer, ticket, REDEEM).
   */
  async ajusterPointsDepuisTicket(
    tenantId: string,
    customerId: string,
    ticketId: string,
    points: number,
  ): Promise<void> {
    if (points === 0) return;
    // Fix I3 : si debit (points < 0), verifie qu'il y a assez sur le solde
    if (points < 0) {
      const solde = await this.repo.solde(tenantId, customerId);
      if (solde + points < 0) {
        throw new BadRequestException(
          `Solde insuffisant : ${solde} points dispos, ${Math.abs(points)} requis`,
        );
      }
    }
    try {
      await this.repo.ajouterTransaction({
        tenantId,
        customerId,
        points,
        transactionType: "REDEEM",
        ticketId,
      });
      // Fix I9 : broadcast pour rafraichir le solde sur les autres postes
      // (notamment pour les modals paiement encore ouvertes ailleurs).
      this.realtime.emitToTenant(tenantId, "fidelite.changed", {
        type: "balance", customerId,
      });
    } catch (err) {
      if (this.repo.estViolationUniqueLoyalty(err)) return;
      throw err;
    }
  }

  async ajusterPoints(
    tenantId: string,
    userId: string,
    customerId: string,
    dto: AjusterPointsDto,
  ): Promise<void> {
    if (dto.points === 0) throw new BadRequestException("Les points doivent etre differents de zero");
    // Fix C3 : empeche un admin d'ajuster un solde cross-tenant.
    await this.assertClientTenant(tenantId, customerId);

    // Fix I3 : refuse si le debit ferait passer le solde sous zero.
    const soldeAvant = await this.repo.solde(tenantId, customerId);
    if (dto.points < 0 && soldeAvant + dto.points < 0) {
      throw new BadRequestException(
        `Ajustement refuse : solde resulterait a ${soldeAvant + dto.points} (negatif). Solde courant : ${soldeAvant}`,
      );
    }

    const row = await this.repo.ajouterTransaction({
      tenantId,
      customerId,
      points: dto.points,
      transactionType: "ADJUST",
      userId,
      note: dto.note,
    });

    // Fix I1 : audit log obligatoire sur ajustement manuel — tracabilite
    // (qui, quand, combien, raison). C'est l'action la plus sensible du
    // module : un admin peut creer 100k points sans contrepartie.
    await this.audit.log({
      tenantId, userId,
      action: AUDIT_ACTIONS.FIDELITE_POINTS_ADJUSTED,
      entityType: "CUSTOMER", entityId: customerId,
      after: {
        transactionId: row?.id,
        points: dto.points,
        soldeAvant,
        soldeApres: soldeAvant + dto.points,
        note: dto.note ?? null,
      },
    });

    // Fix I9 : broadcast pour rafraichir le solde sur les autres postes
    // (fiche client ouverte, modal paiement en cours, etc.).
    this.realtime.emitToTenant(tenantId, "fidelite.changed", {
      type: "balance", customerId,
    });
  }

  async solde(tenantId: string, customerId: string): Promise<SoldeFideliteDto> {
    // Fix C3 : check tenant avant de lire le solde
    await this.assertClientTenant(tenantId, customerId);
    const [solde, config] = await Promise.all([
      this.repo.solde(tenantId, customerId),
      this.repo.obtenirOuCreerConfig(tenantId),
    ]);
    return {
      solde,
      valeurEnFcfa: solde * Number(config.redeemValue),
    };
  }

  async historique(
    tenantId: string,
    customerId: string,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<TransactionFideliteDto[]> {
    // Fix C3 : check tenant avant de lire l'historique
    await this.assertClientTenant(tenantId, customerId);
    const rows = await this.repo.historique(tenantId, customerId, opts);
    return rows.map((r) => ({
      id: r.id,
      points: r.points,
      type: r.transactionType,
      ticketId: r.ticketId,
      ticketNumero: r.ticketNumber ?? null,
      note: r.note ?? null,
      creeLe: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  }
}
