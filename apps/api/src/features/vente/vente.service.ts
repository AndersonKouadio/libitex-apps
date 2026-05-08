import { Injectable } from "@nestjs/common";
import { TicketRepository } from "./repositories/ticket.repository";
import { StockService } from "../stock/stock.service";
import { IngredientService } from "../ingredient/ingredient.service";
import { SupplementService } from "../supplement/supplement.service";
import { AuditService, AUDIT_ACTIONS } from "../../common/audit/audit.service";
import {
  RessourceIntrouvableException,
  PaiementInsuffisantException,
  TicketNonModifiableException,
  NumeroSerieObligatoireException,
  LotIndisponibleException,
} from "../../common/exceptions/metier.exception";
import {
  CreerTicketDto, CompleterTicketDto,
  TicketResponseDto, LigneTicketResponseDto, PaiementResponseDto, RapportZResponseDto,
} from "./dto/vente.dto";
import { PaginatedResponseDto } from "../../common/dto/api-response.dto";

@Injectable()
export class VenteService {
  constructor(
    private readonly ticketRepo: TicketRepository,
    private readonly stockService: StockService,
    private readonly ingredientService: IngredientService,
    private readonly supplementService: SupplementService,
    private readonly audit: AuditService,
  ) {}

  // --- Creer un ticket (ouvert) ---

  async creerTicket(tenantId: string, userId: string, dto: CreerTicketDto): Promise<TicketResponseDto> {
    const numeroTicket = await this.genererNumeroTicket(tenantId);

    const ticket = await this.ticketRepo.creerTicket({
      tenantId, locationId: dto.emplacementId, userId, ticketNumber: numeroTicket,
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

    const total = sousTotal + totalTva;
    const ticketMaj = await this.ticketRepo.mettreAJourTotaux(ticket.id, {
      subtotal: sousTotal.toFixed(2), taxAmount: totalTva.toFixed(2), total: total.toFixed(2),
    });

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.TICKET_CREATED,
      entityType: "TICKET", entityId: ticket.id,
      after: { numeroTicket: ticket.ticketNumber, total: total.toFixed(2), nbLignes: lignesCrees.length },
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

  // --- Rapport Z ---

  async rapportZ(tenantId: string, emplacementId: string, date?: string): Promise<RapportZResponseDto> {
    const targetDate = date || new Date().toISOString().split("T")[0];
    const { summary, paymentBreakdown } = await this.ticketRepo.rapportZ(tenantId, emplacementId, targetDate);

    return {
      date: targetDate,
      emplacementId,
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
   */
  private async resoudreSupplements(
    tenantId: string,
    demandes: Array<{ supplementId: string; quantite: number }>,
  ): Promise<Array<{ supplementId: string; name: string; unitPrice: number; quantity: number }>> {
    if (demandes.length === 0) return [];
    const ids = demandes.map((d) => d.supplementId);
    const supplements = await this.supplementService.listerParIds(tenantId, ids);
    const parId = new Map(supplements.map((s) => [s.id, s]));
    return demandes
      .map((d) => {
        const s = parId.get(d.supplementId);
        if (!s) return null;
        return {
          supplementId: s.id,
          name: s.nom,
          unitPrice: s.prix,
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
