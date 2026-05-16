import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common";
import { TicketRepository } from "./repositories/ticket.repository";
import { StockService } from "../stock/stock.service";
import { IngredientService } from "../ingredient/ingredient.service";
import { ProduitRepository } from "../catalogue/repositories/produit.repository";
import { CatalogueService } from "../catalogue/catalogue.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { AuditService, AUDIT_ACTIONS } from "../../common/audit/audit.service";
import { CashSessionRepository } from "../session-caisse/repositories/cash-session.repository";
import { FideliteService } from "../fidelite/fidelite.service";
import { PromotionService } from "../promotion/promotion.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ComptabiliteService } from "../comptabilite/comptabilite.service";
import {
  RessourceIntrouvableException,
  PaiementInsuffisantException,
  TicketNonModifiableException,
  NumeroSerieObligatoireException,
  LotIndisponibleException,
  SessionCaisseRequiseException,
} from "../../common/exceptions/metier.exception";
import {
  CreerTicketDto, CompleterTicketDto, RetourTicketDto,
  TicketResponseDto, LigneTicketResponseDto, PaiementResponseDto, RapportZResponseDto,
  RapportZJourResponseDto, RapportVentesPeriodeDto, RapportMargesDto, RapportTvaDto,
  LigneJournalDto,
} from "./dto/vente.dto";
import { PaginatedResponseDto } from "../../common/dto/api-response.dto";

@Injectable()
export class VenteService {
  constructor(
    private readonly ticketRepo: TicketRepository,
    private readonly stockService: StockService,
    private readonly ingredientService: IngredientService,
    private readonly produitRepo: ProduitRepository,
    private readonly catalogueService: CatalogueService,
    private readonly realtime: RealtimeGateway,
    private readonly audit: AuditService,
    @Inject(forwardRef(() => CashSessionRepository))
    private readonly sessionRepo: CashSessionRepository,
    private readonly fidelite: FideliteService,
    private readonly promotion: PromotionService,
    private readonly notifications: NotificationsService,
    private readonly comptabilite: ComptabiliteService,
  ) {}

  /**
   * Module 10 D2 : seuil minimum pour declencher l'envoi WhatsApp du
   * ticket. En-dessous, on ne spam pas le client pour un petit achat
   * (cafe, eau...). Configurable via env si besoin plus tard.
   */
  private readonly SEUIL_ENVOI_TICKET_FCFA = 5000;

  // --- Creer un ticket (ouvert) ---

  async creerTicket(tenantId: string, userId: string, dto: CreerTicketDto): Promise<TicketResponseDto> {
    // Idempotence : si le frontend offline avait deja cree ce ticket avant
    // un crash de sync, retourner le ticket existant au lieu de faire un
    // doublon. La cle est un UUID v4 cote frontend (file-attente-offline).
    // Fix C4 du Module 2.
    if (dto.idempotencyKey) {
      const existant = await this.ticketRepo.trouverParIdempotencyKey(
        tenantId, dto.idempotencyKey,
      );
      if (existant) {
        const lignes = await this.ticketRepo.obtenirLignes(existant.id);
        const paiements = await this.ticketRepo.obtenirPaiements(existant.id);
        return this.mapTicket(
          existant,
          lignes.map(this.mapLigne),
          paiements.map(this.mapPaiement),
        );
      }
    }

    // Garde session : refuser si pas de session ouverte du caissier
    // sur l'emplacement concerne. Toute vente est rattachee.
    const session = await this.sessionRepo.trouverActive(tenantId, userId, dto.emplacementId);
    if (!session) throw new SessionCaisseRequiseException();

    // Garde disponibilite : refuser la vente si une variante (MENU ou
    // supplement) est indisponible. Pour les variantes MENU, on verifie
    // aussi que les portions demandees ne depassent pas le stock servable.
    const dispo = await this.catalogueService.disponibilitesEmplacement(
      tenantId, dto.emplacementId,
    );
    const setIndispo = new Set(dispo.indisponibles);
    const setIndispoProduits = new Set(dispo.indisponiblesProduits);
    // Cumul quantites par variante MENU pour comparer aux portions servables
    const qtyMenuParVariante = new Map<string, number>();
    for (const l of dto.lignes) {
      qtyMenuParVariante.set(
        l.varianteId,
        (qtyMenuParVariante.get(l.varianteId) ?? 0) + l.quantite,
      );
      // Supplements : supplementId = productId du supplément.
      for (const s of (l.supplements ?? [])) {
        if (setIndispoProduits.has(s.supplementId)) {
          throw new BadRequestException(
            `Un supplément choisi est en rupture. Retirez-le ou réessayez plus tard.`,
          );
        }
      }
    }
    for (const [varianteId, qtyDemandee] of qtyMenuParVariante.entries()) {
      if (dispo.portionsMenu[varianteId] !== undefined) {
        const portionsDispo = dispo.portionsMenu[varianteId];
        if (portionsDispo < qtyDemandee) {
          throw new BadRequestException(
            `Ingrédients insuffisants pour servir ${qtyDemandee} portion${qtyDemandee > 1 ? "s" : ""} de ce menu (${portionsDispo} disponible${portionsDispo > 1 ? "s" : ""}).`,
          );
        }
      } else if (setIndispo.has(varianteId)) {
        throw new BadRequestException("Un produit du panier est en rupture de stock.");
      }
    }

    const numeroTicket = await this.genererNumeroTicket(tenantId);

    const ticket = await this.ticketRepo.creerTicket({
      tenantId, locationId: dto.emplacementId, userId,
      sessionId: session.id,
      ticketNumber: numeroTicket,
      customerId: dto.clientId,
      customerName: dto.nomClient, customerPhone: dto.telephoneClient, note: dto.note,
      idempotencyKey: dto.idempotencyKey,
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

    // Module 11 D1 (fix I2) : si la raison est "PROMO:CODE", on RE-CALCULE
    // la remise cote serveur depuis la promotion en base (ne fait pas
    // confiance au montant envoye par le front qui peut etre falsifie).
    // Sinon (remise manuelle libre), on garde la valeur envoyee mais
    // plafonnee au sous-total.
    let remiseGlobale = Math.min(
      Math.max(0, dto.remiseGlobale ?? 0),
      sousTotal + totalTva,
    );
    if (dto.raisonRemise?.startsWith("PROMO:") && dto.remiseGlobale && dto.remiseGlobale > 0) {
      const code = dto.raisonRemise.slice("PROMO:".length).trim();
      if (code) {
        const verdict = await this.promotion.valider(tenantId, {
          code, montantTicket: sousTotal + totalTva, clientId: dto.clientId,
        });
        if (verdict.valide && verdict.remise > 0) {
          // Force le serveur a utiliser SA propre valeur calculee,
          // pas ce que le front pretend.
          remiseGlobale = Math.min(verdict.remise, sousTotal + totalTva);
        } else {
          // Code invalide a la creation -> ignorer la remise (ne pas
          // creer le ticket avec une remise non justifiee).
          remiseGlobale = 0;
        }
      }
    }
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
      // Module 11 D1 : snapshot de la raison (utilise par completerTicket
      // pour reappliquer la promo en atomique). Format strict "PROMO:CODE"
      // ou texte libre pour les remises manuelles.
      ...(remiseGlobale > 0 && dto.raisonRemise ? { discountReason: dto.raisonRemise } : {}),
    });

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.TICKET_CREATED,
      entityType: "TICKET", entityId: ticket.id,
      after: {
        numeroTicket: ticket.ticketNumber, total: total.toFixed(2), nbLignes: lignesCrees.length,
        ...(remiseGlobale > 0 ? { remiseGlobale, raisonRemise: dto.raisonRemise } : {}),
      },
    });

    // Module 11 D1 (fix C4) : l'application reelle (increment usage,
    // enregistrement promotion_usages, audit) est differee a
    // completerTicket() — coherent avec le credit fidelite, et evite
    // de consommer un usage si le ticket est annule en PARKED.

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

    // Validation fidelite : si une ligne LOYALTY est presente, le ticket
    // doit etre attache a un client et le solde doit etre suffisant.
    //
    // Fix C1 + C2 + I5 : le debit des points doit etre fait AVANT la
    // creation des paiements et de la cloture du ticket, et propage
    // l'erreur si echec. Avant ce fix :
    // - validation solde (A) et debit (D) etaient separes par 4 ops DB
    // - le debit avait .catch(() => {}) -> ticket complete sans debit
    // - une race entre 2 ventes simultanees pouvait creer un solde negatif
    //
    // Le helper ajusterPointsDepuisTicket re-verifie le solde juste avant
    // l'INSERT (defense en profondeur) et leve si insuffisant.
    const paiementFidelite = dto.paiements.find((p) => p.methode === "LOYALTY");
    let pointsADebiter = 0;
    if (paiementFidelite) {
      if (!ticket.customerId) {
        throw new BadRequestException("Paiement en points : un client doit etre attache au ticket");
      }
      const config = await this.fidelite.obtenirConfig(tenantId);
      if (!config.actif) {
        throw new BadRequestException("Le programme fidelite n'est pas actif");
      }
      if (config.valeurPoint <= 0) {
        throw new BadRequestException("Configuration fidelite invalide (valeur point)");
      }
      pointsADebiter = Math.ceil(paiementFidelite.montant / config.valeurPoint);

      // Debit immediat (avec re-verification du solde dans le service
      // fidelite). Si la fenetre TOC/TOU est utilisee par un autre poste,
      // le debit echouera ici et le ticket ne sera pas complete.
      await this.fidelite.ajusterPointsDepuisTicket(
        tenantId, ticket.customerId, ticket.id, -pointsADebiter,
      );
    }

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

    // Module 11 D1 (fix C1+C2+C4) : applique le code promo de facon
    // atomique au moment de la completion. Si la limite globale a ete
    // atteinte par une vente concurrente (race), l'increment echoue
    // cleanly et on log audit (le ticket reste complete car le client
    // a deja paye). Le montant de la remise est verrouille dans
    // ticket.discountAmount des la creation — recalculer ici causerait
    // une incoherence si le total a evolue entre creation et completion.
    if (ticket.discountReason?.startsWith("PROMO:") && Number(ticket.discountAmount) > 0) {
      const code = ticket.discountReason.slice("PROMO:".length).trim();
      if (code) {
        await this.promotion.appliquerAuTicketEnVerifiant(
          tenantId, userId, code, ticket.id,
          ticket.customerId ?? undefined,
          // On passe le sous-total + TVA (montant AVANT remise) pour
          // que la validation des conditions (montantMin, etc.) soit
          // coherente avec celle faite au panier.
          Number(ticket.subtotal) + Number(ticket.taxAmount),
        );
      }
    }

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

    // Module B2 OHADA — generation de l'ecriture comptable de vente.
    // Fire-and-forget : une erreur compta ne doit JAMAIS bloquer une vente.
    // Le service capture ses propres erreurs et log sans rethrow.
    void this.comptabilite.enregistrerVente(tenantId, {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      completedAt: complete.completedAt ?? new Date(),
      totalTtc: totalTicket,
      totalTva: Number(ticket.taxAmount ?? 0),
      totalRemise: Number(ticket.discountAmount ?? 0),
      paiements: dto.paiements.map((p) => ({ methode: p.methode, montant: Number(p.montant) })),
    });

    // Broadcast aux autres clients du tenant : stock + disponibilites
    // ont change (vente decremente stock variantes ou ingredients menu),
    // et le ticket vient d'etre complete (sidebar POS + dashboard).
    this.realtime.emitToTenant(tenantId, "ticket.completed", {
      ticketId: ticket.id,
      emplacementId: ticket.locationId,
    });
    this.realtime.emitToTenant(tenantId, "stock.updated", { emplacementId: ticket.locationId });
    this.realtime.emitToTenant(tenantId, "disponibilites.changed", { emplacementId: ticket.locationId });

    // Programme fidelite : credit automatique des points GAGNES (EARN)
    // si client lie. Le DEBIT a deja ete applique en amont (avant la
    // creation des paiements), cf fix C1+C2+I5 ci-dessus.
    //
    // Le credit reste en best-effort : un echec ne doit pas annuler la
    // vente (le client a deja ete debite si applicable, et le ticket
    // est deja complete). Mais on log au minimum via Sentry indirect
    // (l'audit log capture le ticket).
    if (ticket.customerId) {
      this.fidelite
        .crediterDepuisTicket(tenantId, ticket.customerId, ticket.id, totalTicket)
        .catch((err) => {
          // Log mais ne propage pas — le ticket est deja complete
          console.error("[fidelite] credit points echoue:", err);
        });
    }

    // Module 10 D2 : envoi WhatsApp du ticket en best-effort.
    // Conditions cumulatives :
    // - ticket rattache a un client (customerId)
    // - total >= seuil (5000 FCFA) pour ne pas spam les petits achats
    // - client a un telephone valide
    // - client a whatsapp_opt_in = true (default true, opt-out manuel)
    // - antiDoublon=true (par ticket.id) pour resister aux retries front
    if (ticket.customerId && totalTicket >= this.SEUIL_ENVOI_TICKET_FCFA) {
      this.envoyerNotificationTicket(tenantId, ticket.id, complete.ticketNumber, totalTicket)
        .catch((err) => console.error("[notif ticket] echoue:", err));
    }

    const paiements = await this.ticketRepo.obtenirPaiements(ticket.id);
    const response = this.mapTicket(complete, lignes.map(this.mapLigne), paiements.map(this.mapPaiement));
    response.monnaie = totalPaye - totalTicket;
    return response;
  }

  /**
   * Module 10 D2 : envoie une notification WhatsApp de confirmation au
   * client apres un ticket. Helper privé pour garder completerTicket
   * lisible. Toujours en best-effort : un echec ici ne doit jamais
   * bloquer le flow de vente.
   */
  private async envoyerNotificationTicket(
    tenantId: string, ticketId: string, numeroTicket: string, total: number,
  ): Promise<void> {
    const ctx = await this.ticketRepo.obtenirContexteNotification(tenantId, ticketId);
    if (!ctx) return;
    if (!ctx.clientTelephone || !ctx.clientOptIn) return;

    const prenom = ctx.clientPrenom ?? "Client";
    const nomComplet = ctx.clientNom ? `${prenom} ${ctx.clientNom}` : prenom;
    const texte = this.notifications.templates.ticket({
      nomClient: nomComplet,
      numeroTicket,
      total,
      nomBoutique: ctx.nomBoutique,
    });

    await this.notifications.envoyer({
      tenantId,
      canal: "whatsapp",
      type: "ticket",
      destinataire: ctx.clientTelephone,
      texte,
      entityType: "TICKET",
      entityId: ticketId,
      antiDoublon: true,
      payload: { numeroTicket, total },
    });
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

    // Module 11 D2 : si le ticket avait consomme un code promo, on libere
    // l'usage (decrement compteur + suppression promotion_usages). Best-
    // effort : un echec ne re-leve pas l'annulation. Note : un ticket
    // PARKED n'a pas encore consomme la promo (application differee a
    // completerTicket), donc rien a liberer pour ces cas.
    this.promotion.libererUsagesTicket(tenantId, ticketId)
      .catch((err) => console.error("[promotion] liberation usages echouee:", err));

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.TICKET_VOIDED,
      entityType: "TICKET", entityId: ticketId,
      before: { statut: ticket.status, total: ticket.total },
      after: { statut: "VOIDED", numeroTicket: ticket.ticketNumber },
    });

    const lignes = await this.ticketRepo.obtenirLignes(ticketId);
    return this.mapTicket(voided, lignes.map(this.mapLigne), []);
  }

  // --- Retours POS (A3) ---

  /**
   * Crée un ticket de retour lié au ticket original.
   * - Valide que le ticket original est COMPLETED et de type SALE.
   * - Vérifie que les quantités demandées ne dépassent pas ce qui n'a pas
   *   encore été retourné (gestion des retours partiels successifs).
   * - Crée le ticket RETURN, les lignes correspondantes, les mouvements
   *   RETURN_IN en stock, et enregistre le remboursement.
   * - Résultat immédiatement COMPLETED (pas de flow paiement séparé).
   */
  async retournerTicket(
    tenantId: string,
    userId: string,
    ticketId: string,
    dto: RetourTicketDto,
  ): Promise<TicketResponseDto> {
    // 1. Valider ticket original
    const original = await this.ticketRepo.obtenirParId(tenantId, ticketId);
    if (!original) throw new RessourceIntrouvableException("Ticket", ticketId);
    if (original.status !== "COMPLETED") {
      throw new BadRequestException("Seul un ticket complété peut faire l'objet d'un retour");
    }
    if ((original as any).ticketType === "RETURN") {
      throw new BadRequestException("Un ticket de retour ne peut pas être retourné");
    }

    // 2. Lignes originales enrichies (nom produit, sku, unitPrice, variantId)
    const lignesOrig = await this.ticketRepo.obtenirLignesAvecDetails(ticketId);

    // 3. Quantités déjà retournées par variantId (Map<variantId, qty>)
    const dejaRetournees = await this.ticketRepo.quantitesDejaRetournees(tenantId, ticketId);

    // 4. Valider les lignes du DTO et calculer les totaux
    const lignesRetour: Array<{
      variantId: string; nomProduit: string; nomVariante: string | null;
      sku: string; quantite: number; unitPrice: number;
    }> = [];
    let total = 0;

    for (const lr of dto.lignes) {
      const ligneOrig = lignesOrig.find((l) => l.id === lr.ligneId);
      if (!ligneOrig) {
        throw new BadRequestException(`Ligne ${lr.ligneId} introuvable dans le ticket original`);
      }
      const dejaRet = dejaRetournees.get(ligneOrig.variantId) ?? 0;
      const disponible = Number(ligneOrig.quantity) - dejaRet;
      if (lr.quantite > disponible) {
        throw new BadRequestException(
          `Quantité retournée (${lr.quantite}) supérieure au disponible (${disponible}) pour ${ligneOrig.nomProduit}`,
        );
      }
      const unitPrice = Number(ligneOrig.unitPrice);
      lignesRetour.push({
        variantId: ligneOrig.variantId,
        nomProduit: ligneOrig.nomProduit,
        nomVariante: ligneOrig.nomVariante ?? null,
        sku: ligneOrig.sku,
        quantite: lr.quantite,
        unitPrice,
      });
      total += lr.quantite * unitPrice;
    }

    // 5. Numéro du ticket de retour : RET-<original>-<suffix 2 chiffres>
    const nbRetours = await this.ticketRepo.compterRetoursDuTicket(tenantId, ticketId);
    const suffix = String(nbRetours + 1).padStart(2, "0");
    const numeroRetour = `RET-${original.ticketNumber}-${suffix}`;

    // 6. Créer le ticket de retour (COMPLETED immédiatement)
    const ticketRetour = await this.ticketRepo.creerTicketRetour({
      tenantId,
      locationId: original.locationId,
      userId,
      ticketNumber: numeroRetour,
      refTicketId: ticketId,
      customerId: original.customerId ?? undefined,
      customerName: original.customerName ?? undefined,
      customerPhone: original.customerPhone ?? undefined,
      subtotal: total.toFixed(2),
      total: total.toFixed(2),
      motif: dto.motif,
    });

    // 7. Créer les lignes de retour
    for (const lr of lignesRetour) {
      await this.ticketRepo.creerLigne({
        ticketId: ticketRetour.id,
        variantId: lr.variantId,
        productName: lr.nomProduit,
        variantName: lr.nomVariante,
        sku: lr.sku,
        quantity: lr.quantite.toString(),
        unitPrice: lr.unitPrice.toFixed(2),
        discount: "0",
        taxRate: "0",
        taxAmount: "0",
        lineTotal: (lr.quantite * lr.unitPrice).toFixed(2),
      });
    }

    // 8. Mouvements RETURN_IN : remet la marchandise en stock
    for (const lr of lignesRetour) {
      await this.stockService.retourStock(
        tenantId, userId, lr.variantId, original.locationId,
        lr.quantite, ticketRetour.id,
      );
    }

    // 9. Enregistrer le remboursement
    await this.ticketRepo.creerPaiement({
      ticketId: ticketRetour.id,
      method: dto.methodeRemboursement,
      amount: total.toFixed(2),
      reference: dto.reference,
    });

    // 10. Audit + realtime
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.TICKET_RETURNED,
      entityType: "TICKET", entityId: ticketRetour.id,
      after: {
        numeroRetour,
        refTicket: original.ticketNumber,
        total: total.toFixed(2),
        methode: dto.methodeRemboursement,
        lignes: lignesRetour.length,
      },
    });
    this.realtime.emitToTenant(tenantId, "ticket.returned", {
      ticketId: ticketRetour.id, refTicketId: ticketId,
    });
    this.realtime.emitToTenant(tenantId, "stock.updated", { emplacementId: original.locationId });

    // 11. Mapper la réponse
    const lignesBD = await this.ticketRepo.obtenirLignes(ticketRetour.id);
    const paiementsBD = await this.ticketRepo.obtenirPaiements(ticketRetour.id);
    return this.mapTicket(ticketRetour, lignesBD.map(this.mapLigne), paiementsBD.map(this.mapPaiement));
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

  /**
   * Journal des ventes — liste plate sans N+1.
   * Retourne les en-tetes de tickets avec noms client + emplacement resolus.
   */
  async listerJournal(
    tenantId: string,
    page: number,
    limit: number,
    opts: { emplacementId?: string; statut?: string; dateDebut?: string; dateFin?: string; customerId?: string },
  ): Promise<PaginatedResponseDto<LigneJournalDto>> {
    const { rows, total } = await this.ticketRepo.listerJournal(tenantId, {
      limit, offset: (page - 1) * limit, ...opts,
    });
    const items: LigneJournalDto[] = rows.map((r) => ({
      id: r.id,
      ticketNumber: r.ticketNumber,
      status: r.status,
      total: Number(r.total ?? 0),
      discountAmount: Number(r.discountAmount ?? 0),
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      locationId: r.locationId,
      nomEmplacement: r.nomEmplacement ?? null,
      customerId: r.customerId ?? null,
      nomClient: [r.prenomClient, r.nomClient].filter(Boolean).join(" ") || null,
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

  async rapportVentesPeriode(
    tenantId: string, debut: string, fin: string, emplacementId?: string,
  ): Promise<RapportVentesPeriodeDto> {
    const rows = await this.ticketRepo.ventesParPeriode(tenantId, debut, fin, emplacementId);
    const jours = rows.map((r) => {
      const recettes = Math.round(Number(r.recettes));
      const nombre = Number(r.nombre);
      return {
        date: r.date,
        recettes,
        nombre,
        tva: Math.round(Number(r.tva)),
        remises: Math.round(Number(r.remises)),
        ticketMoyen: nombre > 0 ? Math.round(recettes / nombre) : 0,
      };
    });
    const totaux = jours.reduce(
      (acc, j) => ({
        recettes: acc.recettes + j.recettes,
        tickets: acc.tickets + j.nombre,
        tva: acc.tva + j.tva,
        remises: acc.remises + j.remises,
      }),
      { recettes: 0, tickets: 0, tva: 0, remises: 0 },
    );
    return {
      debut, fin, emplacementId: emplacementId ?? null, jours,
      totaux: {
        ...totaux,
        ticketMoyen: totaux.tickets > 0 ? Math.round(totaux.recettes / totaux.tickets) : 0,
      },
    };
  }

  async rapportTva(
    tenantId: string, debut: string, fin: string, emplacementId?: string,
  ): Promise<RapportTvaDto> {
    const rows = await this.ticketRepo.tvaParTaux(tenantId, debut, fin, emplacementId);
    const taux = rows.map((r) => ({
      taux: Number(r.taux),
      baseHt: Math.round(Number(r.baseHt)),
      tva: Math.round(Number(r.tva)),
      totalTtc: Math.round(Number(r.totalTtc)),
      nombreLignes: Number(r.nombreLignes),
    }));
    const totaux = taux.reduce(
      (acc, t) => ({
        baseHt: acc.baseHt + t.baseHt,
        tva: acc.tva + t.tva,
        totalTtc: acc.totalTtc + t.totalTtc,
        nombreLignes: acc.nombreLignes + t.nombreLignes,
      }),
      { baseHt: 0, tva: 0, totalTtc: 0, nombreLignes: 0 },
    );
    return { debut, fin, emplacementId: emplacementId ?? null, taux, totaux };
  }

  async rapportMarges(
    tenantId: string, debut: string, fin: string, emplacementId?: string,
  ): Promise<RapportMargesDto> {
    const rows = await this.ticketRepo.margesParProduit(tenantId, debut, fin, emplacementId);
    const lignes = rows.map((r) => {
      const ca = Number(r.chiffreAffaires);
      const qty = Number(r.quantiteTotale);
      const pa = Number(r.prixAchat ?? 0);
      const cout = qty * pa;
      const marge = ca - cout;
      return {
        variantId: r.variantId,
        nomProduit: r.nomProduit,
        nomVariante: r.nomVariante,
        sku: r.sku,
        quantiteTotale: qty,
        chiffreAffaires: Math.round(ca),
        coutTotal: Math.round(cout),
        margeBrute: Math.round(marge),
        margePourcent: ca > 0 ? Math.round((marge / ca) * 1000) / 10 : 0,
        prixAchatManquant: pa === 0,
      };
    });
    const totaux = lignes.reduce(
      (acc, l) => ({
        chiffreAffaires: acc.chiffreAffaires + l.chiffreAffaires,
        coutTotal: acc.coutTotal + l.coutTotal,
        quantiteTotale: acc.quantiteTotale + l.quantiteTotale,
      }),
      { chiffreAffaires: 0, coutTotal: 0, quantiteTotale: 0 },
    );
    const margeBrute = totaux.chiffreAffaires - totaux.coutTotal;
    return {
      debut, fin, emplacementId: emplacementId ?? null, lignes,
      totaux: {
        ...totaux, margeBrute,
        margePourcent: totaux.chiffreAffaires > 0
          ? Math.round((margeBrute / totaux.chiffreAffaires) * 1000) / 10
          : 0,
      },
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
      clientId: raw.customerId ?? null,
      nomClient: raw.customerName,
      telephoneClient: raw.customerPhone,
      note: raw.note,
      completeLe: raw.completedAt?.toISOString?.() ?? raw.completedAt ?? null,
      creeLe: raw.createdAt?.toISOString?.() ?? raw.createdAt,
      lignes,
      paiements,
      type: raw.ticketType ?? "SALE",
      refTicketId: raw.refTicketId ?? null,
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
