import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger, InternalServerErrorException } from "@nestjs/common";
import { AchatRepository } from "./repositories/achat.repository";
import { LandedCostService, type LigneReception } from "./services/landed-cost.service";
import {
  CreerFournisseurDto, ModifierFournisseurDto, FournisseurResponseDto,
  CreerCommandeDto, ReceptionCommandeDto, ModifierStatutCommandeDto,
  CommandeResponseDto, LigneCommandeResponseDto,
  CreerFraisDto, ModifierFraisDto, FraisResponseDto,
} from "./dto/achat.dto";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class AchatService {
  private readonly logger = new Logger(AchatService.name);

  constructor(
    private readonly achatRepo: AchatRepository,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
    private readonly landedCost: LandedCostService,
  ) {}

  // ─── Fournisseurs ─────────────────────────────────────────────────────

  async creerFournisseur(tenantId: string, dto: CreerFournisseurDto): Promise<FournisseurResponseDto> {
    const row = await this.achatRepo.creerFournisseur({
      tenantId,
      name: dto.nom,
      contactName: dto.nomContact,
      phone: dto.telephone,
      email: dto.email,
      address: dto.adresse,
      paymentTerms: dto.conditionsPaiement,
      notes: dto.notes,
    });
    return this.mapFournisseur(row);
  }

  async listerFournisseurs(tenantId: string, recherche?: string): Promise<FournisseurResponseDto[]> {
    const rows = await this.achatRepo.listerFournisseurs(tenantId, recherche);
    return rows.map((r) => this.mapFournisseur(r));
  }

  async obtenirFournisseur(tenantId: string, id: string): Promise<FournisseurResponseDto> {
    const row = await this.achatRepo.trouverFournisseur(tenantId, id);
    if (!row) throw new NotFoundException("Fournisseur introuvable");
    return this.mapFournisseur(row);
  }

  async modifierFournisseur(
    tenantId: string,
    id: string,
    dto: ModifierFournisseurDto,
  ): Promise<FournisseurResponseDto> {
    const existant = await this.achatRepo.trouverFournisseur(tenantId, id);
    if (!existant) throw new NotFoundException("Fournisseur introuvable");
    const row = await this.achatRepo.modifierFournisseur(tenantId, id, {
      name: dto.nom,
      contactName: dto.nomContact ?? null,
      phone: dto.telephone ?? null,
      email: dto.email ?? null,
      address: dto.adresse ?? null,
      paymentTerms: dto.conditionsPaiement ?? null,
      notes: dto.notes ?? null,
      isActive: dto.actif,
    });
    return this.mapFournisseur(row);
  }

  async supprimerFournisseur(tenantId: string, id: string): Promise<void> {
    const existant = await this.achatRepo.trouverFournisseur(tenantId, id);
    if (!existant) throw new NotFoundException("Fournisseur introuvable");
    await this.achatRepo.supprimerFournisseur(tenantId, id);
  }

  private mapFournisseur(row: any): FournisseurResponseDto {
    return {
      id: row.id,
      nom: row.name,
      nomContact: row.contactName ?? null,
      telephone: row.phone ?? null,
      email: row.email ?? null,
      adresse: row.address ?? null,
      conditionsPaiement: row.paymentTerms ?? null,
      notes: row.notes ?? null,
      actif: row.isActive,
      creeLe: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    };
  }

  // ─── Commandes ────────────────────────────────────────────────────────

  /** Nombre max de retries pour la generation du numero de commande. */
  private static readonly MAX_RETRIES_NUMERO = 5;

  /**
   * Cree une commande avec validations strictes :
   * - Fournisseur appartient au tenant (deja check)
   * - Emplacement appartient au tenant (fix I9)
   * - Toutes les variantes appartiennent au tenant (fix C3 cross-tenant)
   * - Retry-on-conflict sur orderNumber pour gerer les creations concurrentes (fix C4)
   */
  async creerCommande(
    tenantId: string,
    userId: string,
    dto: CreerCommandeDto,
  ): Promise<CommandeResponseDto> {
    // [DEBUG TEMPORAIRE A.5] — wrapper pour exposer l'erreur exacte dans la reponse
    // Supprimer apres diagnostic.
    let _step = "init";
    try {
      return await this._creerCommandeImpl(tenantId, userId, dto, (s) => { _step = s; });
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ForbiddenException || err instanceof NotFoundException) throw err;
      const msg = err instanceof Error ? `[DIAG step=${_step}] ${err.name}: ${err.message}` : `[DIAG step=${_step}] ${String(err)}`;
      this.logger.error(msg, err instanceof Error ? err.stack : undefined);
      throw new InternalServerErrorException(msg);
    }
  }

  private async _creerCommandeImpl(
    tenantId: string,
    userId: string,
    dto: CreerCommandeDto,
    setStep: (s: string) => void,
  ): Promise<CommandeResponseDto> {
    setStep("trouverFournisseur");
    const fournisseur = await this.achatRepo.trouverFournisseur(tenantId, dto.fournisseurId);
    if (!fournisseur) throw new BadRequestException("Fournisseur introuvable");

    setStep("emplacementDuTenant");
    const emplacement = await this.achatRepo.emplacementDuTenant(tenantId, dto.emplacementId);
    if (!emplacement) {
      throw new ForbiddenException("Emplacement introuvable ou inaccessible");
    }

    setStep("variantesDuTenant");
    const variantIds = dto.lignes.map((l) => l.varianteId);
    const valides = await this.achatRepo.variantesDuTenant(tenantId, variantIds);
    const intrus = variantIds.filter((id) => !valides.has(id));
    if (intrus.length > 0) {
      throw new ForbiddenException(
        `Variante(s) inaccessible(s) ou hors tenant : ${intrus.slice(0, 3).join(", ")}${intrus.length > 3 ? "..." : ""}`,
      );
    }

    const devise = (dto.devise ?? "XOF").toUpperCase();
    const tauxChange = dto.tauxChange && dto.tauxChange > 0 ? dto.tauxChange : 1.0;
    const sousTotalDevise = dto.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
    const total = sousTotalDevise * tauxChange;

    let commande;
    for (let attempt = 0; attempt < AchatService.MAX_RETRIES_NUMERO; attempt += 1) {
      setStep(`prochainNumeroCommande(attempt=${attempt})`);
      const orderNumber = await this.achatRepo.prochainNumeroCommande(tenantId);
      try {
        setStep(`creerCommande(orderNumber=${orderNumber})`);
        commande = await this.achatRepo.creerCommande({
          tenantId,
          orderNumber,
          supplierId: dto.fournisseurId,
          locationId: dto.emplacementId,
          expectedDate: dto.dateAttendue ? new Date(dto.dateAttendue) : undefined,
          notes: dto.notes,
          createdBy: userId,
          totalAmount: total.toFixed(2),
        });
        break;
      } catch (err) {
        if (this.achatRepo.estViolationUniqueOrderNumber(err) && attempt < AchatService.MAX_RETRIES_NUMERO - 1) {
          continue;
        }
        throw err;
      }
    }
    if (!commande) {
      throw new BadRequestException("Echec de generation du numero de commande (concurrence trop forte)");
    }

    setStep("ajouterLignes");
    await this.achatRepo.ajouterLignes(dto.lignes.map((l) => {
      const unitPriceXOF = l.prixUnitaire * tauxChange;
      const lineTotalXOF = l.quantite * unitPriceXOF;
      return {
        purchaseOrderId: commande!.id,
        variantId: l.varianteId,
        quantityOrdered: l.quantite.toString(),
        unitPrice: unitPriceXOF.toFixed(2),
        lineTotal: lineTotalXOF.toFixed(2),
      };
    }));

    setStep("majDeviseCommande");
    try {
      await this.achatRepo.majDeviseCommande(commande.id, devise, tauxChange.toFixed(6));
    } catch (err) {
      this.logger.warn(
        `Maj devise commande ${commande.id} echouee: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    setStep("emitToTenant");
    this.realtime.emitToTenant(tenantId, "commande.creee", { id: commande.id });

    setStep("obtenirCommande");
    return this.obtenirCommande(tenantId, commande.id);
  }

  async listerCommandes(tenantId: string, filtres: {
    statut?: string;
    fournisseurId?: string;
    emplacementId?: string;
  } = {}): Promise<CommandeResponseDto[]> {
    const rows = await this.achatRepo.listerCommandes(tenantId, {
      statut: filtres.statut,
      supplierId: filtres.fournisseurId,
      locationId: filtres.emplacementId,
    });
    return rows.map((r) => ({
      id: r.id,
      numero: r.orderNumber,
      fournisseurId: r.supplierId,
      nomFournisseur: r.supplierName,
      emplacementId: r.locationId,
      nomEmplacement: r.locationName,
      statut: r.status,
      montantTotal: Number(r.totalAmount),
      // Phase A.2 : expose les totaux landed dans la liste aussi
      fraisTotal: Number(r.costsTotal ?? 0),
      totalDebarque: Number(r.landedTotal ?? r.totalAmount),
      methodeAllocation: (r.costsAllocationMethod ?? "QUANTITY") as "QUANTITY" | "WEIGHT" | "VALUE",
      // Phase A.5 : multi-devises. sousTotalDevise = totalAmount XOF / tauxChange.
      devise: r.currencyCode ?? "XOF",
      tauxChange: Number(r.exchangeRateAtOrder ?? 1),
      sousTotalDevise: ((): number => {
        const taux = Number(r.exchangeRateAtOrder ?? 1);
        const total = Number(r.totalAmount ?? 0);
        return taux > 0 ? Number((total / taux).toFixed(2)) : total;
      })(),
      dateAttendue: r.expectedDate ? new Date(r.expectedDate).toISOString() : null,
      dateReception: r.receivedAt ? new Date(r.receivedAt).toISOString() : null,
      notes: r.notes ?? null,
      creeLe: new Date(r.createdAt).toISOString(),
    }));
  }

  async obtenirCommande(tenantId: string, id: string): Promise<CommandeResponseDto> {
    const commande = await this.achatRepo.trouverCommande(tenantId, id);
    if (!commande) throw new NotFoundException("Commande introuvable");
    const fournisseur = await this.achatRepo.trouverFournisseur(tenantId, commande.supplierId);
    // Phase A.3 : expose le nom de l'emplacement dans la reponse detail
    const emplacement = await this.achatRepo.emplacementDuTenant(tenantId, commande.locationId);
    const lignes = await this.achatRepo.listerLignesCommande(id);

    // Phase A.5 : prix en devise commande = prixUnitaire XOF / tauxChange
    const tauxLecture = Number(commande.exchangeRateAtOrder ?? 1) || 1;
    const lignesDto: LigneCommandeResponseDto[] = lignes.map((l) => ({
      id: l.id,
      varianteId: l.variantId,
      produitId: l.productId,
      nomProduit: l.productName,
      nomVariante: l.variantName ?? null,
      sku: l.sku,
      quantiteCommandee: Number(l.quantityOrdered),
      quantiteRecue: Number(l.quantityReceived),
      prixUnitaire: Number(l.unitPrice),
      prixUnitaireDevise: tauxLecture > 0
        ? Number((Number(l.unitPrice) / tauxLecture).toFixed(2))
        : Number(l.unitPrice),
      totalLigne: Number(l.lineTotal),
      // Phase A.4 : CUMP actuel pour preview de l'impact a la reception
      cumpActuel: Number(l.cumpActuel ?? 0),
    }));

    return {
      id: commande.id,
      numero: commande.orderNumber,
      fournisseurId: commande.supplierId,
      nomFournisseur: fournisseur?.name ?? "",
      emplacementId: commande.locationId,
      nomEmplacement: emplacement?.name ?? "",
      statut: commande.status,
      montantTotal: Number(commande.totalAmount),
      // Phase A.2 : exposer les totaux landed pour l'UI
      fraisTotal: Number(commande.costsTotal ?? 0),
      totalDebarque: Number(commande.landedTotal ?? commande.totalAmount),
      methodeAllocation: (commande.costsAllocationMethod ?? "QUANTITY") as "QUANTITY" | "WEIGHT" | "VALUE",
      // Phase A.5 : multi-devises. sousTotalDevise = totalAmount XOF / tauxChange.
      devise: commande.currencyCode ?? "XOF",
      tauxChange: Number(commande.exchangeRateAtOrder ?? 1),
      sousTotalDevise: ((): number => {
        const taux = Number(commande.exchangeRateAtOrder ?? 1);
        const total = Number(commande.totalAmount ?? 0);
        return taux > 0 ? Number((total / taux).toFixed(2)) : total;
      })(),
      dateAttendue: commande.expectedDate ? new Date(commande.expectedDate).toISOString() : null,
      dateReception: commande.receivedAt ? new Date(commande.receivedAt).toISOString() : null,
      notes: commande.notes ?? null,
      creeLe: new Date(commande.createdAt).toISOString(),
      lignes: lignesDto,
    };
  }

  async modifierStatut(
    tenantId: string,
    id: string,
    dto: ModifierStatutCommandeDto,
  ): Promise<CommandeResponseDto> {
    const commande = await this.achatRepo.trouverCommande(tenantId, id);
    if (!commande) throw new NotFoundException("Commande introuvable");
    if (commande.status === "RECEIVED") {
      throw new BadRequestException("Une commande deja recue ne peut pas changer de statut");
    }
    await this.achatRepo.modifierStatutCommande(tenantId, id, dto.statut);
    return this.obtenirCommande(tenantId, id);
  }

  /**
   * Module 10 D3 : envoie le bon de commande au fournisseur via WhatsApp.
   * Le commercant clique sur "Envoyer au fournisseur" depuis la page
   * detail. La commande passe automatiquement en statut SENT si elle
   * etait en DRAFT (cohesion : envoyer = annoncer).
   *
   * Pre-conditions :
   * - commande existe
   * - fournisseur a un telephone
   * Sinon le service leve une BadRequest claire (afficher cote front).
   */
  async envoyerAuFournisseur(
    tenantId: string, commandeId: string,
  ): Promise<{ envoye: boolean; raison?: string }> {
    const ctx = await this.achatRepo.obtenirContexteEnvoiBdC(tenantId, commandeId);
    if (!ctx) throw new NotFoundException("Commande introuvable");
    if (!ctx.telephoneFournisseur) {
      throw new BadRequestException(
        "Le fournisseur n'a pas de telephone enregistre. Ajoutez-le dans sa fiche.",
      );
    }

    const texte = this.notifications.templates.purchaseOrder({
      nomFournisseur: ctx.nomFournisseur,
      numeroCommande: ctx.numeroCommande,
      nombreLignes: ctx.nombreLignes,
      montantTotal: Number(ctx.montantTotal),
      nomBoutique: ctx.nomBoutique,
    });

    const ok = await this.notifications.envoyer({
      tenantId,
      canal: "whatsapp",
      type: "purchase_order",
      destinataire: ctx.telephoneFournisseur,
      texte,
      entityType: "PURCHASE_ORDER",
      entityId: commandeId,
      // Pas d'anti-doublon : le commercant peut vouloir renvoyer
      // (le fournisseur a perdu le message, etc.).
      antiDoublon: false,
      payload: { numeroCommande: ctx.numeroCommande, montant: Number(ctx.montantTotal) },
    });

    // Bascule DRAFT -> SENT si applicable (envoyer = marquer envoye).
    if (ok && ctx.statut === "DRAFT") {
      await this.achatRepo.modifierStatutCommande(tenantId, commandeId, "SENT");
    }

    return { envoye: ok, raison: ok ? undefined : "Echec d'envoi WhatsApp (voir notifications admin)" };
  }

  /**
   * Reception (totale ou partielle) d'une commande. Cree un mouvement
   * STOCK_IN par ligne, cumule sur quantityReceived, met a jour les prix
   * d'achat si demande, et met a jour le statut global :
   *  - tout recu -> RECEIVED + receivedAt
   *  - partiel -> PARTIAL (receivedAt = premiere reception)
   *
   * Fix C1 : TOUTES les ecritures (mouvements + lignes + prix + statut)
   * sont commits ATOMIQUEMENT via `db.batch()` (transaction Neon HTTP).
   * Avant ce fix, une erreur a la 3eme ligne laissait le stock
   * partiellement credite et l'etat incoherent.
   *
   * Fix C5 : realtime emit avec la liste des `variantIds` affectes pour
   * que les POS rafraichissent uniquement les variantes concernees au
   * lieu de tout le stock.
   *
   * Race residuelle : entre la lecture des lignes et l'application,
   * un autre caller pourrait modifier. db.batch protege l'atomicite des
   * ECRITURES, pas l'isolation read+write. Pour serialiser strictement,
   * il faudrait switcher vers neon-serverless avec transaction(callback).
   * Cas d'usage rare en pratique : 2 caissiers receptionnent la meme
   * commande en meme temps.
   */
  async receptionner(
    tenantId: string,
    userId: string,
    id: string,
    dto: ReceptionCommandeDto,
  ): Promise<CommandeResponseDto> {
    const commande = await this.achatRepo.trouverCommande(tenantId, id);
    if (!commande) throw new NotFoundException("Commande introuvable");
    if (commande.status === "RECEIVED" || commande.status === "CANCELLED") {
      throw new BadRequestException(
        `Commande ${commande.status === "RECEIVED" ? "deja recue" : "annulee"}`,
      );
    }

    const lignes = await this.achatRepo.listerLignesCommande(id);
    const parId = new Map(lignes.map((l) => [l.id, l]));

    // Fix I5 : Prix Moyen Pondere (PMP). On precharge le stock et le prix
    // d'achat actuel de chaque variante pour calculer la nouvelle moyenne :
    //   PMP_nouveau = (stock_avant * PMP_avant + qte_recue * prix_recu)
    //                 / (stock_avant + qte_recue)
    // Cela evite de faire 2 requetes par variante dans la boucle.
    let stockActuelMap: Map<string, number> = new Map();
    let prixAchatActuelMap: Map<string, number> = new Map();
    if (dto.majPrixAchat) {
      const variantIdsConcernes = [...new Set(
        dto.lignes
          .filter((r) => r.quantite > 0)
          .map((r) => parId.get(r.ligneId)?.variantId)
          .filter((v): v is string => !!v),
      )];
      stockActuelMap = await this.achatRepo.stockTotalParVariante(tenantId, variantIdsConcernes);
      prixAchatActuelMap = await this.achatRepo.prixAchatActuelParVariante(variantIdsConcernes);
    }

    // Construit les writes a appliquer atomiquement
    const mouvements: Array<{ variantId: string; quantity: string }> = [];
    const lignesMaj: Array<{ ligneId: string; quantiteRecue: string }> = [];
    const prixAchatMaj: Array<{ variantId: string; prix: string }> = [];
    const variantIdsAffectes = new Set<string>();
    // Etat projete pour calculer le nouveau statut
    const cumulesProjetes = new Map<string, number>();
    for (const l of lignes) {
      cumulesProjetes.set(l.id, Number(l.quantityReceived));
    }

    for (const recue of dto.lignes) {
      if (recue.quantite <= 0) continue;
      const ligne = parId.get(recue.ligneId);
      if (!ligne) throw new BadRequestException(`Ligne ${recue.ligneId} introuvable`);

      const cumule = Number(ligne.quantityReceived) + recue.quantite;
      if (cumule > Number(ligne.quantityOrdered) + 0.001) {
        throw new BadRequestException(
          `Reception ${ligne.productName} : ${cumule} > commande ${ligne.quantityOrdered}`,
        );
      }

      mouvements.push({
        variantId: ligne.variantId,
        quantity: recue.quantite.toString(),
      });
      lignesMaj.push({
        ligneId: ligne.id,
        quantiteRecue: cumule.toString(),
      });
      if (dto.majPrixAchat) {
        // Fix I5 : PMP au lieu de l'ecrasement par le dernier prix.
        // Formule : PMP = (stock * PMP_actuel + qte_recue * prix_recu)
        //                 / (stock + qte_recue)
        // Si la variante n'a aucun stock (premier achat) -> PMP = prix recu.
        const stockAvant = stockActuelMap.get(ligne.variantId) ?? 0;
        const pmpAvant = prixAchatActuelMap.get(ligne.variantId) ?? 0;
        const prixRecu = Number(ligne.unitPrice);
        const qteRecue = recue.quantite;
        const denom = stockAvant + qteRecue;
        const pmpNouveau = denom > 0
          ? (stockAvant * pmpAvant + qteRecue * prixRecu) / denom
          : prixRecu;
        prixAchatMaj.push({
          variantId: ligne.variantId,
          prix: pmpNouveau.toFixed(2),
        });
        // Le stock projete pour la prochaine ligne (meme variante 2 fois
        // dans dto.lignes peu probable, mais defense en profondeur).
        stockActuelMap.set(ligne.variantId, stockAvant + qteRecue);
        prixAchatActuelMap.set(ligne.variantId, pmpNouveau);
      }
      variantIdsAffectes.add(ligne.variantId);
      cumulesProjetes.set(ligne.id, cumule);
    }

    if (mouvements.length === 0) {
      // Rien a faire : aucune ligne avec quantite > 0
      return this.obtenirCommande(tenantId, id);
    }

    // Calcule le nouveau statut a partir de l'etat projete
    const totalCommande = lignes.reduce((s, l) => s + Number(l.quantityOrdered), 0);
    const totalProjete = lignes.reduce((s, l) => s + (cumulesProjetes.get(l.id) ?? 0), 0);
    const proche = (a: number, b: number) => Math.abs(a - b) < 0.001;
    const tout = proche(totalProjete, totalCommande);
    const partiel = totalProjete > 0 && !tout;

    let nouveauStatut: "PARTIAL" | "RECEIVED" | undefined;
    let receivedAt: Date | undefined;
    if (tout) {
      nouveauStatut = "RECEIVED";
      receivedAt = new Date();
    } else if (partiel && commande.status !== "PARTIAL") {
      nouveauStatut = "PARTIAL";
      receivedAt = commande.receivedAt ?? new Date();
    }

    // Fix C1 : tout dans un seul db.batch (atomique cote Neon)
    await this.achatRepo.appliquerReceptionAtomique({
      tenantId,
      commandeId: id,
      orderNumber: commande.orderNumber,
      locationId: commande.locationId,
      userId,
      mouvements,
      lignes: lignesMaj,
      prixAchat: prixAchatMaj,
      nouveauStatut,
      receivedAt,
    });

    // Phase A.2 : Landed Cost + recalcul CUMP. Best-effort : un echec ici
    // (pas de frais saisis, calcul invalide) n'invalide PAS la reception
    // qui est deja appliquee (stock + lignes en DB). On log + on continue.
    try {
      await this.appliquerLandedCost(tenantId, id, commande.costsAllocationMethod, dto.lignes, parId);
    } catch (err) {
      this.logger.error(
        `[A.2] Echec calcul Landed Cost pour commande ${id} : ` +
        `${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Fix C5 : emit avec variantIds precis pour que les POS rafraichissent
    // uniquement les variantes affectees au lieu de tout le stock.
    this.realtime.emitToTenant(tenantId, "stock.updated", {
      locationId: commande.locationId,
      variantIds: Array.from(variantIdsAffectes),
    });
    this.realtime.emitToTenant(tenantId, "disponibilites.changed", {
      locationId: commande.locationId,
      variantIds: Array.from(variantIdsAffectes),
    });

    return this.obtenirCommande(tenantId, id);
  }

  // ─── Phase A.2 : CRUD frais d'approche (Landed Cost) ──────────────────

  /**
   * Liste les frais d'une commande. Verifie d'abord que la commande
   * appartient au tenant (cross-tenant guard).
   */
  async listerFrais(tenantId: string, commandeId: string): Promise<FraisResponseDto[]> {
    const commande = await this.achatRepo.trouverCommande(tenantId, commandeId);
    if (!commande) throw new NotFoundException("Commande introuvable");
    const rows = await this.achatRepo.listerFraisCommande(commandeId);
    return rows.map((r) => this.mapFrais(r));
  }

  /**
   * Ajoute un frais a une commande. Calcule amount_in_base (montant
   * converti en devise tenant) puis met a jour costs_total + landed_total
   * de la commande. Refus si commande RECEIVED ou CANCELLED (les frais
   * apres reception complete n'ont plus de sens — ils doivent etre
   * inseres AVANT la reception finale pour etre ventiles sur les lignes).
   */
  async ajouterFrais(
    tenantId: string, userId: string, commandeId: string, dto: CreerFraisDto,
  ): Promise<FraisResponseDto> {
    const commande = await this.achatRepo.trouverCommande(tenantId, commandeId);
    if (!commande) throw new NotFoundException("Commande introuvable");
    if (commande.status === "CANCELLED") {
      throw new BadRequestException("Commande annulee, impossible d'ajouter un frais");
    }

    const amountInBase = dto.montant * dto.tauxChange;
    const row = await this.achatRepo.ajouterFraisCommande({
      tenantId,
      purchaseOrderId: commandeId,
      category: dto.categorie,
      label: dto.libelle,
      amount: dto.montant.toFixed(2),
      currency: dto.devise.toUpperCase(),
      exchangeRate: dto.tauxChange.toFixed(6),
      amountInBase: amountInBase.toFixed(2),
      notes: dto.notes,
      createdBy: userId,
    });

    // Met a jour le snapshot costs_total + landed_total
    const sommeFrais = await this.achatRepo.sommerFraisCommande(commandeId);
    await this.achatRepo.majTotauxCommande(commandeId, sommeFrais, Number(commande.totalAmount));

    return this.mapFrais(row);
  }

  async modifierFrais(
    tenantId: string, commandeId: string, fraisId: string, dto: ModifierFraisDto,
  ): Promise<FraisResponseDto> {
    const commande = await this.achatRepo.trouverCommande(tenantId, commandeId);
    if (!commande) throw new NotFoundException("Commande introuvable");

    // Recharge le frais courant pour calculer le nouveau amount_in_base
    // si montant/taux ont change.
    const existant = (await this.achatRepo.listerFraisCommande(commandeId))
      .find((f) => f.id === fraisId);
    if (!existant) throw new NotFoundException("Frais introuvable");

    const update: any = {};
    if (dto.categorie !== undefined) update.category = dto.categorie;
    if (dto.libelle !== undefined) update.label = dto.libelle;
    if (dto.devise !== undefined) update.currency = dto.devise.toUpperCase();
    if (dto.notes !== undefined) update.notes = dto.notes;

    let nouveauMontant = dto.montant !== undefined ? dto.montant : Number(existant.amount);
    let nouveauTaux = dto.tauxChange !== undefined ? dto.tauxChange : Number(existant.exchangeRate);
    if (dto.montant !== undefined) update.amount = dto.montant.toFixed(2);
    if (dto.tauxChange !== undefined) update.exchangeRate = dto.tauxChange.toFixed(6);
    if (dto.montant !== undefined || dto.tauxChange !== undefined) {
      update.amountInBase = (nouveauMontant * nouveauTaux).toFixed(2);
    }

    const row = await this.achatRepo.modifierFraisCommande(fraisId, update);
    if (!row) throw new NotFoundException("Frais introuvable");

    // Met a jour le snapshot
    const sommeFrais = await this.achatRepo.sommerFraisCommande(commandeId);
    await this.achatRepo.majTotauxCommande(commandeId, sommeFrais, Number(commande.totalAmount));

    return this.mapFrais(row);
  }

  async supprimerFrais(
    tenantId: string, commandeId: string, fraisId: string,
  ): Promise<void> {
    const commande = await this.achatRepo.trouverCommande(tenantId, commandeId);
    if (!commande) throw new NotFoundException("Commande introuvable");
    await this.achatRepo.supprimerFraisCommande(fraisId);

    const sommeFrais = await this.achatRepo.sommerFraisCommande(commandeId);
    await this.achatRepo.majTotauxCommande(commandeId, sommeFrais, Number(commande.totalAmount));
  }

  private mapFrais(r: any): FraisResponseDto {
    return {
      id: r.id,
      categorie: r.category,
      libelle: r.label,
      montant: Number(r.amount),
      devise: r.currency,
      tauxChange: Number(r.exchangeRate),
      montantEnBase: Number(r.amountInBase),
      notes: r.notes ?? null,
      creeLe: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    };
  }

  /**
   * Phase A.2 : ventile les frais d'approche sur les lignes recues et
   * met a jour le CUMP des variants. Helper extrait de receptionner()
   * pour garder ce dernier lisible.
   *
   * Si pas de frais (somme = 0), landed_unit_cost = unit_price, le CUMP
   * est quand meme recalcule (utile pour le premier stock du variant).
   */
  private async appliquerLandedCost(
    tenantId: string,
    commandeId: string,
    methode: "QUANTITY" | "WEIGHT" | "VALUE",
    lignesDto: ReceptionCommandeDto["lignes"],
    parId: Map<string, LigneCommandeBrute>,
  ): Promise<void> {
    // 1. Recupere la somme des frais (deja convertis en devise tenant)
    const fraisTotal = await this.achatRepo.sommerFraisCommande(commandeId);

    // 2. Met a jour le snapshot total commande pour les rapports
    const commandeRow = await this.achatRepo.trouverCommande(tenantId, commandeId);
    if (commandeRow) {
      await this.achatRepo.majTotauxCommande(
        commandeId,
        fraisTotal,
        Number(commandeRow.totalAmount),
      );
    }

    // 3. Recupere les poids si methode = WEIGHT
    const lignesRecues: LigneReception[] = lignesDto
      .filter((r) => r.quantite > 0)
      .map((r) => {
        const ligne = parId.get(r.ligneId)!;
        return {
          lineId: ligne.id,
          variantId: ligne.variantId,
          quantiteRecue: r.quantite,
          unitPrice: Number(ligne.unitPrice),
        };
      });

    if (methode === "WEIGHT") {
      const poids = await this.achatRepo.obtenirPoidsVariantes(
        [...new Set(lignesRecues.map((l) => l.variantId))],
      );
      for (const l of lignesRecues) {
        l.poidsUnitaire = poids.get(l.variantId) ?? 0;
      }
    }

    // 4. Calcule landed_unit_cost par ligne
    const resultats = this.landedCost.calculerLandedCosts(
      lignesRecues,
      fraisTotal,
      methode,
    );

    // 5. Persiste les couts debarques + recalcule CUMP atomiquement
    await this.landedCost.appliquerLandedEtRecalculerCump(tenantId, resultats);
  }
}

/** Phase A.2 : alias de type pour le helper appliquerLandedCost. */
type LigneCommandeBrute = Awaited<
  ReturnType<AchatRepository["listerLignesCommande"]>
>[number];
