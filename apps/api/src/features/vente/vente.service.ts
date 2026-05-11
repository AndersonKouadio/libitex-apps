import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { TicketRepository } from "./repositories/ticket.repository";
import { StockService } from "../stock/stock.service";
import { IngredientService } from "../ingredient/ingredient.service";
import { ProduitRepository } from "../catalogue/repositories/produit.repository";
import { AuditService, AUDIT_ACTIONS } from "../../common/audit/audit.service";
import { CashSessionRepository } from "../session-caisse/repositories/cash-session.repository";
import {
  RessourceIntrouvableException,
  PaiementInsuffisantException,
  TicketNonModifiableException,
  NumeroSerieObligatoireException,
  LotIndisponibleException,
  SessionCaisseRequiseException,
} from "../../common/exceptions/metier.exception";
import {
  CreerTicketDto, CompleterTicketDto,
  TicketResponseDto, LigneTicketResponseDto, PaiementResponseDto, RapportZResponseDto,
  RapportZJourResponseDto,
} from "./dto/vente.dto";
import { PaginatedResponseDto } from "../../common/dto/api-response.dto";

@Injectable()
export class VenteService {
  constructor(
    private readonly ticketRepo: TicketRepository,
    private readonly stockService: StockService,
    private readonly ingredientService: IngredientService,
    private readonly produitRepo: ProduitRepository,
    private readonly audit: AuditService,
    @Inject(forwardRef(() => CashSessionRepository))
    private readonly sessionRepo: CashSessionRepository,
  ) {}

  // --- Creer un ticket (ouvert) ---

  async creerTicket(tenantId: string, userId: string, dto: CreerTicketDto): Promise<TicketResponseDto> {
    // Garde session : refuser si pas de session ouverte du caissier
    // sur l'emplacement concerne. Toute vente est rattachee.
    const session = await this.sessionRepo.trouverActive(tenantId, userId, dto.emplacementId);
    if (!session) throw new SessionCaisseRequiseException();

    const numeroTicket = await this.genererNumeroTicket(tenantId);

    const ticket = await this.ticketRepo.creerTicket({
      tenantId, locationId: dto.emplacementId, userId,
      sessionId: session.id,
      ticketNumber: numeroTicket,
      customerName: dto.nomClient, customerPhone: dto.telephoneClient, note: dto.note,
    });

    let sousTotal = 0;
    let totalTva = 0;
    const lignesCrees: any[] = [];

    for (const ligne of dto.lignes) {
      const resolved = await this.ticketRepo.obtenirVarianteAvecProduit(ligne.varianteId);
      if (!resolved) throw new RessourceIntrouvableException("Variante", ligne.varianteId);

      const { variant, product } = resolved;
      const prixUnitaire = ligne.prixUnitaire ?? Number(variant.priceRetail);
      const remise = ligne.remise ?? 0;
      const tauxTva = Number(product.taxRate ?? 0);

      // Resolution des supplements pour figer leur prix au moment de la vente
      // (un changement de prix ulterieur ne doit pas affecter ce ticket).
      const supplementsLigne = await this.resoudreSupplements(tenantId, ligne.supplements ?? []);
      const totalSupplements = supplementsLigne.reduce(
        (s, sup) => s + sup.unitPrice * sup.quantity,
        0,
      );

      const sousTotalLigne = prixUnitaire * ligne.quantite + totalSupplements - remise;
      const tvaLigne = sousTotalLigne * (tauxTva / 100);
      const totalLigne = sousTotalLigne + tvaLigne;

      let serialNumber = ligne.numeroSerie;
      let serialId: string | undefined;
      let batchId: string | undefined;
      let batchNumber: string | undefined;

      if (product.productType === "SERIALIZED") {
        if (!ligne.numeroSerie) throw new NumeroSerieObligatoireException(product.name);
        const serial = await this.ticketRepo.trouverSerieDisponible(variant.id, ligne.numeroSerie);
        if (!serial) throw new RessourceIntrouvableException("Numéro de serie", ligne.numeroSerie);
        serialId = serial.id;
        serialNumber = serial.serialNumber;
      }

      if (product.productType === "PERISHABLE") {
        const lot = await this.ticketRepo.trouverLotFefo(variant.id);
        if (!lot) throw new LotIndisponibleException(product.name);
        batchId = lot.id;
        batchNumber = lot.batchNumber;
      }

      const ligneCree = await this.ticketRepo.creerLigne({
        ticketId: ticket.id, variantId: variant.id,
        productName: product.name, variantName: variant.name, sku: variant.sku,
        quantity: ligne.quantite.toString(), unitPrice: prixUnitaire.toString(),
        discount: remise.toString(), taxRate: tauxTva.toString(),
        taxAmount: tvaLigne.toFixed(2), lineTotal: totalLigne.toFixed(2),
        serialNumber, serialId, batchId, batchNumber,
        supplements: supplementsLigne,
      });

      sousTotal += sousTotalLigne;
      totalTva += tvaLigne;
      lignesCrees.push(ligneCree);
    }

    // Remise globale : montant calcule cote front, plafonne au sous-total
    // pour eviter un total negatif. La raison (libre ou pre-selectionnee) est
    // tracee dans le champ note du ticket prefixee par "Remise:".
    const remiseGlobale = Math.min(
      Math.max(0, dto.remiseGlobale ?? 0),
      sousTotal + totalTva,
    );
    const total = Math.max(0, sousTotal + totalTva - remiseGlobale);

    const noteFinale = dto.raisonRemise && remiseGlobale > 0
      ? [dto.note, `Remise: ${dto.raisonRemise} (-${remiseGlobale.toFixed(0)} F)`]
        .filter(Boolean).join(" · ")
      : dto.note;

    const ticketMaj = await this.ticketRepo.mettreAJourTotaux(ticket.id, {
      subtotal: sousTotal.toFixed(2),
      taxAmount: totalTva.toFixed(2),
      discountAmount: remiseGlobale.toFixed(2),
      total: total.toFixed(2),
      ...(noteFinale !== dto.note ? { note: noteFinale } : {}),
    });

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.TICKET_CREATED,
      entityType: "TICKET", entityId: ticket.id,
      after: {
        numeroTicket: ticket.ticketNumber, total: total.toFixed(2), nbLignes: lignesCrees.length,
        ...(remiseGlobale > 0 ? { remiseGlobale, raisonRemise: dto.raisonRemise } : {}),
      },
    });

    return this.mapTicket(ticketMaj, lignesCrees.map(this.mapLigne), []);
  }

  // --- Completer (payer + decrementer stock) ---

  async completerTicket(
    tenantId: string, userId: string, ticketId: string, dto: CompleterTicketDto,
  ): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepo.obtenirParId(tenantId, ticketId);
    if (!ticket) throw new RessourceIntrouvableException("Ticket", ticketId);
    if (ticket.status !== "OPEN" && ticket.status !== "PARKED") {
      throw new TicketNonModifiableException(ticket.status);
    }

    // Auto-rattach : si le ticket flotte (sessionId null parce que reporte
    // d'une ancienne session), on le rattache a la session active du
    // caissier qui l'encaisse maintenant.
    if (!ticket.sessionId) {
      const session = await this.sessionRepo.trouverActive(tenantId, userId, ticket.locationId);
      if (!session) throw new SessionCaisseRequiseException();
      await this.ticketRepo.rattacherSession(ticket.id, session.id);
    }

    const totalPaye = dto.paiements.reduce((sum, p) => sum + p.montant, 0);
    const totalTicket = Number(ticket.total);
    if (totalPaye < totalTicket) throw new PaiementInsuffisantException(totalPaye, totalTicket);

    for (const p of dto.paiements) {
      await this.ticketRepo.creerPaiement({
        ticketId: ticket.id, method: p.methode, amount: p.montant.toString(), reference: p.reference,
      });
    }

    const lignes = await this.ticketRepo.obtenirLignes(ticket.id);
    for (const ligne of lignes) {
      const resolved = await this.ticketRepo.obtenirVarianteAvecProduit(ligne.variantId);
      const estMenu = resolved?.product.productType === "MENU";
      // ticketLines.quantity est numeric(15, 3) -> string cote drizzle.
      const quantiteVendue = Number(ligne.quantity);

      if (estMenu) {
        // Pour un menu: pas de stock variant a decrementer, on consomme
        // les ingredients de la recette.
        await this.ingredientService.consommerRecette({
          tenantId,
          userId,
          variantId: ligne.variantId,
          locationId: ticket.locationId,
          quantiteVendue,
          reference: ticket.id,
        });
      } else {
        await this.stockService.sortieStock(
          tenantId, userId, ligne.variantId, ticket.locationId,
          quantiteVendue, "TICKET", ticket.id,
          ligne.serialId ?? undefined, ligne.batchId ?? undefined,
        );
        if (ligne.serialId) await this.ticketRepo.marquerSerieVendue(ligne.serialId, ticket.id);
        if (ligne.batchId) await this.ticketRepo.decrementerLot(ligne.batchId, quantiteVendue);
      }
    }

    const complete = await this.ticketRepo.changerStatut(tenantId, ticketId, "COMPLETED", {
      completedAt: new Date(),
    });

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.TICKET_COMPLETED,
      entityType: "TICKET", entityId: ticket.id,
      after: {
        numeroTicket: ticket.ticketNumber,
        total: totalTicket,
        totalPaye,
        methodes: dto.paiements.map((p) => p.methode),
      },
    });

    const paiements = await this.ticketRepo.obtenirPaiements(ticket.id);
    const response = this.mapTicket(complete, lignes.map(this.mapLigne), paiements.map(this.mapPaiement));
    response.monnaie = totalPaye - totalTicket;
    return response;
  }

  // --- Mettre en attente ---

  async mettreEnAttente(tenantId: string, userId: string, ticketId: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepo.obtenirParId(tenantId, ticketId);
    if (!ticket) throw new RessourceIntrouvableException("Ticket", ticketId);
    if (ticket.status !== "OPEN") throw new TicketNonModifiableException(ticket.status);

    const parked = await this.ticketRepo.changerStatut(tenantId, ticketId, "PARKED");

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.TICKET_PARKED,
      entityType: "TICKET", entityId: ticketId,
      before: { statut: ticket.status }, after: { statut: "PARKED", numeroTicket: ticket.ticketNumber },
    });

    const lignes = await this.ticketRepo.obtenirLignes(ticketId);
    return this.mapTicket(parked, lignes.map(this.mapLigne), []);
  }

  // --- Annuler ---

  async annuler(tenantId: string, userId: string, ticketId: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepo.obtenirParId(tenantId, ticketId);
    if (!ticket) throw new RessourceIntrouvableException("Ticket", ticketId);
    if (ticket.status === "COMPLETED") throw new TicketNonModifiableException(ticket.status);

    const voided = await this.ticketRepo.changerStatut(tenantId, ticketId, "VOIDED");

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.TICKET_VOIDED,
      entityType: "TICKET", entityId: ticketId,
      before: { statut: ticket.status, total: ticket.total },
      after: { statut: "VOIDED", numeroTicket: ticket.ticketNumber },
    });

    const lignes = await this.ticketRepo.obtenirLignes(ticketId);
    return this.mapTicket(voided, lignes.map(this.mapLigne), []);
  }

  // --- Reporter a la prochaine session (uniquement PARKED) ---
  // Detache le ticket de sa session actuelle. Au prochain Reprendre par un
  // caissier dont la session est ouverte sur le meme emplacement, il sera
  // rattache automatiquement (cf. completerTicket).

  async reporter(tenantId: string, ticketId: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepo.obtenirParId(tenantId, ticketId);
    if (!ticket) throw new RessourceIntrouvableException("Ticket", ticketId);
    if (ticket.status !== "PARKED") throw new TicketNonModifiableException(ticket.status);

    await this.ticketRepo.detacherSession(ticketId);
    const ticketMaj = await this.ticketRepo.obtenirParId(tenantId, ticketId);
    const lignes = await this.ticketRepo.obtenirLignes(ticketId);
    return this.mapTicket(ticketMaj, lignes.map(this.mapLigne), []);
  }

  // --- Obtenir un ticket ---

  async obtenirTicket(tenantId: string, ticketId: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepo.obtenirParId(tenantId, ticketId);
    if (!ticket) throw new RessourceIntrouvableException("Ticket", ticketId);

    const lignes = await this.ticketRepo.obtenirLignes(ticketId);
    const paiements = await this.ticketRepo.obtenirPaiements(ticketId);
    return this.mapTicket(ticket, lignes.map(this.mapLigne), paiements.map(this.mapPaiement));
  }

  // --- Lister ---

  async listerTickets(
    tenantId: string, page: number, limit: number, emplacementId?: string, statut?: string,
  ): Promise<PaginatedResponseDto<TicketResponseDto>> {
    const { data, total } = await this.ticketRepo.listerTickets(tenantId, {
      emplacementId, statut, limit, offset: (page - 1) * limit,
    });
    const items = await Promise.all(data.map(async (t) => {
      const lignes = await this.ticketRepo.obtenirLignes(t.id);
      const paiements = await this.ticketRepo.obtenirPaiements(t.id);
      return this.mapTicket(t, lignes.map(this.mapLigne), paiements.map(this.mapPaiement));
    }));
    return PaginatedResponseDto.create(items, total, page, limit);
  }

  // --- Rapport Z d'une session ---

  /**
   * Rapport Z par emplacement + date. Agrege tous les tickets COMPLETED
   * du jour, independamment des sessions caisse ouvertes ce jour-la.
   */
  async rapportZParJour(
    tenantId: string,
    emplacementId: string,
    date: string,
  ): Promise<RapportZJourResponseDto> {
    const { summary, paymentBreakdown, topProduits, ventesParHeure } =
      await this.ticketRepo.rapportZParDate(tenantId, emplacementId, date);

    return {
      emplacementId,
      date,
      resume: {
        totalTickets: Number(summary.totalTickets ?? 0),
        chiffreAffaires: Number(summary.totalRevenue ?? 0),
        totalTva: Number(summary.totalTax ?? 0),
        totalRemise: Number(summary.totalDiscount ?? 0),
      },
      ventilationPaiements: paymentBreakdown.map((p) => ({
        methode: p.method, total: Number(p.total), nombre: Number(p.count),
      })),
      topProduits: topProduits.map((p) => ({
        variantId: p.variantId,
        nomProduit: p.nomProduit,
        nomVariante: p.nomVariante,
        sku: p.sku,
        quantite: Number(p.quantite),
        chiffreAffaires: Math.round(Number(p.chiffreAffaires)),
      })),
      ventesParHeure: ventesParHeure.map((v) => ({
        heure: Number(v.heure),
        recettes: Math.round(Number(v.recettes)),
        nombre: Number(v.nombre),
      })),
    };
  }

  async rapportZ(tenantId: string, sessionId: string): Promise<RapportZResponseDto> {
    const session = await this.sessionRepo.obtenirParId(tenantId, sessionId);
    if (!session) throw new RessourceIntrouvableException("Session caisse", sessionId);

    const { summary, paymentBreakdown } = await this.ticketRepo.rapportZParSession(tenantId, sessionId);

    return {
      sessionId,
      numeroSession: session.sessionNumber,
      emplacementId: session.locationId,
      ouvertA: session.openedAt.toISOString(),
      fermeA: session.closedAt?.toISOString() ?? null,
      resume: {
        totalTickets: Number(summary.totalTickets ?? 0),
        chiffreAffaires: Number(summary.totalRevenue ?? 0),
        totalTva: Number(summary.totalTax ?? 0),
        totalRemise: Number(summary.totalDiscount ?? 0),
      },
      ventilationPaiements: paymentBreakdown.map((p) => ({
        methode: p.method, total: Number(p.total), nombre: Number(p.count),
      })),
    };
  }

  // --- Helpers ---

  private async genererNumeroTicket(tenantId: string): Promise<string> {
    const today = new Date();
    const prefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    const count = await this.ticketRepo.compterTicketsDuJour(tenantId);
    return `TK-${prefix}-${String(count + 1).padStart(4, "0")}`;
  }

  private mapTicket(raw: any, lignes: LigneTicketResponseDto[], paiements: PaiementResponseDto[]): TicketResponseDto {
    return {
      id: raw.id,
      numeroTicket: raw.ticketNumber,
      statut: raw.status,
      emplacementId: raw.locationId,
      sousTotal: Number(raw.subtotal ?? 0),
      montantTva: Number(raw.taxAmount ?? 0),
      montantRemise: Number(raw.discountAmount ?? 0),
      total: Number(raw.total ?? 0),
      nomClient: raw.customerName,
      telephoneClient: raw.customerPhone,
      note: raw.note,
      completeLe: raw.completedAt?.toISOString?.() ?? raw.completedAt ?? null,
      creeLe: raw.createdAt?.toISOString?.() ?? raw.createdAt,
      lignes,
      paiements,
    };
  }

  private mapLigne(raw: any): LigneTicketResponseDto {
    const supplementsRaw = Array.isArray(raw.supplements) ? raw.supplements : [];
    return {
      id: raw.id,
      varianteId: raw.variantId,
      nomProduit: raw.productName,
      nomVariante: raw.variantName,
      sku: raw.sku,
      quantite: Number(raw.quantity),
      prixUnitaire: Number(raw.unitPrice),
      remise: Number(raw.discount ?? 0),
      tauxTva: Number(raw.taxRate ?? 0),
      montantTva: Number(raw.taxAmount ?? 0),
      totalLigne: Number(raw.lineTotal),
      numeroSerie: raw.serialNumber,
      numeroBatch: raw.batchNumber,
      supplements: supplementsRaw.map((s: any) => ({
        supplementId: s.supplementId,
        nom: s.name,
        prixUnitaire: Number(s.unitPrice ?? 0),
        quantite: Number(s.quantity ?? 1),
      })),
    };
  }

  /**
   * Resout les supplements demandes (par id + quantite) en figeant leur nom et prix
   * au moment de la vente. Les changements de prix ulterieurs n'affectent pas le ticket.
   *
   * Depuis la refonte Option A, les supplements sont des produits avec
   * isSupplement=true. L'id passe est l'id du produit ; le prix vient de sa
   * premiere variante.
   */
  private async resoudreSupplements(
    tenantId: string,
    demandes: Array<{ supplementId: string; quantite: number }>,
  ): Promise<Array<{ supplementId: string; name: string; unitPrice: number; quantity: number }>> {
    if (demandes.length === 0) return [];
    const ids = demandes.map((d) => d.supplementId);
    const produits = await this.produitRepo.listerParIdsAvecVariantes(tenantId, ids);
    const parId = new Map(produits.map((p) => [p.id, p]));
    return demandes
      .map((d) => {
        const p = parId.get(d.supplementId);
        if (!p || !p.variantes[0]) return null;
        return {
          supplementId: p.id,
          name: p.name,
          unitPrice: Number(p.variantes[0].priceRetail ?? 0),
          quantity: d.quantite,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  private mapPaiement(raw: any): PaiementResponseDto {
    return {
      id: raw.id,
      methode: raw.method,
      montant: Number(raw.amount),
      reference: raw.reference,
    };
  }
}
