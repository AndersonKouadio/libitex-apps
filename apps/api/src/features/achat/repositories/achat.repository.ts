import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, sql, desc, ilike, or, inArray, like, type SQL } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, suppliers, purchaseOrders, purchaseOrderLines,
  purchaseOrderCosts, stockMovements, variants, products, locations, tenants,
} from "@libitex/db";

@Injectable()
export class AchatRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  // ─── Suppliers ────────────────────────────────────────────────────────

  async creerFournisseur(data: {
    tenantId: string;
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    paymentTerms?: string;
    notes?: string;
  }) {
    const [row] = await this.db.insert(suppliers).values(data).returning();
    return row;
  }

  async listerFournisseurs(tenantId: string, recherche?: string) {
    const conditions: SQL[] = [
      eq(suppliers.tenantId, tenantId),
      isNull(suppliers.deletedAt),
    ];
    if (recherche) {
      conditions.push(or(
        ilike(suppliers.name, `%${recherche}%`),
        ilike(suppliers.contactName, `%${recherche}%`),
        ilike(suppliers.phone, `%${recherche}%`),
        ilike(suppliers.email, `%${recherche}%`),
      )!);
    }
    return this.db
      .select()
      .from(suppliers)
      .where(and(...conditions))
      .orderBy(suppliers.name);
  }

  async trouverFournisseur(tenantId: string, id: string) {
    return this.db.query.suppliers.findFirst({
      where: and(
        eq(suppliers.id, id),
        eq(suppliers.tenantId, tenantId),
        isNull(suppliers.deletedAt),
      ),
    });
  }

  async modifierFournisseur(tenantId: string, id: string, data: Partial<{
    name: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    paymentTerms: string | null;
    notes: string | null;
    isActive: boolean;
  }>) {
    const [row] = await this.db
      .update(suppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
      .returning();
    return row;
  }

  async supprimerFournisseur(tenantId: string, id: string) {
    await this.db
      .update(suppliers)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)));
  }

  // ─── Calculs Prix Moyen Pondere (PMP) ────────────────────────────────

  /**
   * Fix I5 : retourne le prix d'achat actuel (PMP en cours) pour un set
   * de variantes. Permet de calculer le nouveau PMP a chaque reception.
   *
   * Retourne une Map<variantId, prixActuel>. Si une variante n'existe pas,
   * elle est absente de la Map (le service traitera comme prixActuel=0).
   */
  async prixAchatActuelParVariante(variantIds: string[]): Promise<Map<string, number>> {
    if (variantIds.length === 0) return new Map();
    const rows = await this.db
      .select({ id: variants.id, prixAchat: variants.pricePurchase })
      .from(variants)
      .where(inArray(variants.id, variantIds));
    return new Map(rows.map((r) => [r.id, Number(r.prixAchat ?? 0)]));
  }

  /**
   * Fix I5 : stock total agrege sur TOUTES les locations pour chaque
   * variante. Le PMP est un concept au niveau variante (pas par
   * emplacement) car le prix d'achat est unique pour la variante.
   *
   * Retourne Map<variantId, quantiteTotale>. Variante non-presente = 0.
   */
  async stockTotalParVariante(tenantId: string, variantIds: string[]): Promise<Map<string, number>> {
    if (variantIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        variantId: stockMovements.variantId,
        total: sql<number>`COALESCE(SUM(${stockMovements.quantity}), 0)`,
      })
      .from(stockMovements)
      .where(and(
        eq(stockMovements.tenantId, tenantId),
        inArray(stockMovements.variantId, variantIds),
      ))
      .groupBy(stockMovements.variantId);
    return new Map(rows.map((r) => [r.variantId, Number(r.total)]));
  }

  // ─── Validations tenant ──────────────────────────────────────────────

  /**
   * Fix C3 : retourne le sous-ensemble des `variantIds` qui appartiennent
   * au `tenantId` (via la jointure products). Les ids manquants signalent
   * une tentative cross-tenant et le service doit rejeter.
   */
  async variantesDuTenant(tenantId: string, variantIds: string[]): Promise<Set<string>> {
    if (variantIds.length === 0) return new Set();
    const rows = await this.db
      .select({ id: variants.id })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(
        inArray(variants.id, variantIds),
        eq(products.tenantId, tenantId),
        isNull(products.deletedAt),
      ));
    return new Set(rows.map((r) => r.id));
  }

  /**
   * Fix I9 : valide que `locationId` appartient bien au tenant. Renvoie
   * null si l'emplacement n'existe pas ou n'est pas dans le tenant.
   */
  async emplacementDuTenant(tenantId: string, locationId: string) {
    return this.db.query.locations.findFirst({
      where: and(
        eq(locations.id, locationId),
        eq(locations.tenantId, tenantId),
        isNull(locations.deletedAt),
      ),
    });
  }

  // ─── Purchase Orders ──────────────────────────────────────────────────

  /**
   * Calcule le prochain numero de commande pour aujourd'hui :
   * BC-YYYYMMDD-NNN. NNN est le MAX suffixe deja utilise + 1 (le MAX evite
   * les trous si une commande a ete supprimee).
   *
   * Fix C4 (ameliore) : utilise le query builder Drizzle (.select()) au lieu
   * de db.execute() pour eviter les ambiguites sur le format de retour du
   * driver neon-http (qui renvoie { rows: [...] } et non un tableau direct).
   * La protection finale contre les races reste la contrainte UNIQUE +
   * retry-on-conflict cote service.
   */
  async prochainNumeroCommande(tenantId: string): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const prefix = `BC-${y}${m}${d}`;
    const startPos = prefix.length + 2; // position apres "BC-YYYYMMDD-"

    const [row] = await this.db
      .select({
        maxSuffix: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${purchaseOrders.orderNumber} FROM ${startPos}) AS INTEGER)), 0)`,
      })
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.tenantId, tenantId),
        like(purchaseOrders.orderNumber, `${prefix}-%`),
        isNull(purchaseOrders.deletedAt),
      ));

    const next = Number(row?.maxSuffix ?? 0) + 1;
    return `${prefix}-${String(next).padStart(3, "0")}`;
  }

  /** @deprecated Conserve pour compat. Utilise `prochainNumeroCommande`. */
  async genererNumeroCommande(tenantId: string): Promise<string> {
    return this.prochainNumeroCommande(tenantId);
  }

  /**
   * Verifie si une erreur Postgres est une violation de contrainte UNIQUE
   * sur orderNumber (code 23505). Gere les deux formats possibles :
   * - NeonDbError direct : { code, constraint, message }
   * - Erreur wrappee par neon-http/Drizzle : { message: "Failed query..." }
   *   avec le code Postgres dans err.cause ou dans le message lui-meme.
   */
  estViolationUniqueOrderNumber(err: unknown): boolean {
    if (typeof err !== "object" || err === null) return false;
    const e = err as Record<string, unknown>;

    // Format 1 : NeonDbError direct avec .code et .constraint
    const code = String(e["code"] ?? e["sourceError"]?.["code"] ?? "");
    if (code === "23505") {
      const constraint = String(
        e["constraint"] ?? e["sourceError"]?.["constraint"] ?? e["message"] ?? "",
      );
      return constraint.includes("purchase_orders_number") || constraint.includes("order_number");
    }

    // Format 2 : Drizzle/neon-http wrapping — code dans le message
    const msg = String(e["message"] ?? "");
    if (msg.includes("23505") || msg.includes("duplicate key")) {
      return msg.includes("purchase_orders_number") || msg.includes("order_number");
    }

    return false;
  }

  async creerCommande(data: {
    tenantId: string;
    orderNumber: string;
    supplierId: string;
    locationId: string;
    expectedDate?: Date;
    notes?: string;
    createdBy?: string;
    totalAmount: string;
    // Phase A.5 : multi-devises (optionnels — defaut XOF, taux 1.0)
    // Ces deux colonnes sont en DB depuis Phase A.1 (currency_code,
    // exchange_rate_at_order). Le sous-total en devise est recalcule a la
    // lecture (totalAmount / exchangeRateAtOrder).
    currencyCode?: string;
    exchangeRateAtOrder?: string;
  }) {
    const [row] = await this.db.insert(purchaseOrders).values(data).returning();
    return row;
  }

  async ajouterLignes(lignes: {
    purchaseOrderId: string;
    variantId: string;
    quantityOrdered: string;
    /** Prix unitaire EN DEVISE TENANT (XOF). Le prix en devise commande
     *  est calcule a la lecture (unitPrice / exchangeRateAtOrder). */
    unitPrice: string;
    lineTotal: string;
  }[]) {
    if (lignes.length === 0) return;
    await this.db.insert(purchaseOrderLines).values(lignes);
  }

  /**
   * Phase A.5 : maj devise + taux post-insert. Tolerant a l'absence des
   * colonnes (try/catch dans le service appelant). Permet de creer la
   * commande meme si les colonnes Phase A.1 ne sont pas presentes en prod.
   */
  async majDeviseCommande(commandeId: string, devise: string, taux: string) {
    await this.db
      .update(purchaseOrders)
      .set({
        currencyCode: devise,
        exchangeRateAtOrder: taux,
      })
      .where(eq(purchaseOrders.id, commandeId));
  }

  async listerCommandes(tenantId: string, filtres: {
    statut?: string;
    supplierId?: string;
    locationId?: string;
    /** Si true, inclut les commandes soft-deleted (annulees). Defaut false. */
    inclureAnnulees?: boolean;
  } = {}) {
    const conditions: SQL[] = [eq(purchaseOrders.tenantId, tenantId)];
    // Fix C6 : par defaut on cache les commandes annulees (soft-deleted).
    if (!filtres.inclureAnnulees) {
      conditions.push(isNull(purchaseOrders.deletedAt));
    }
    if (filtres.statut) conditions.push(eq(purchaseOrders.status, filtres.statut as any));
    if (filtres.supplierId) conditions.push(eq(purchaseOrders.supplierId, filtres.supplierId));
    if (filtres.locationId) conditions.push(eq(purchaseOrders.locationId, filtres.locationId));

    return this.db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        locationId: purchaseOrders.locationId,
        locationName: locations.name,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        // Phase A.2 : totaux landed cost
        costsTotal: purchaseOrders.costsTotal,
        landedTotal: purchaseOrders.landedTotal,
        costsAllocationMethod: purchaseOrders.costsAllocationMethod,
        // Phase A.5 : multi-devises (subtotalInCurrency calcule au service)
        currencyCode: purchaseOrders.currencyCode,
        exchangeRateAtOrder: purchaseOrders.exchangeRateAtOrder,
        expectedDate: purchaseOrders.expectedDate,
        receivedAt: purchaseOrders.receivedAt,
        notes: purchaseOrders.notes,
        createdAt: purchaseOrders.createdAt,
        nombreLignes: sql<number>`(SELECT COUNT(*) FROM ${purchaseOrderLines} WHERE ${purchaseOrderLines.purchaseOrderId} = ${purchaseOrders.id})::int`,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .innerJoin(locations, eq(purchaseOrders.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.createdAt));
  }

  async trouverCommande(tenantId: string, id: string) {
    return this.db.query.purchaseOrders.findFirst({
      where: and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId),
      ),
    });
  }

  /**
   * Module 10 D3 : contexte pour l'envoi WhatsApp d'un bon de commande
   * a un fournisseur. Retourne en une query :
   * - nom boutique (tenant.name)
   * - infos fournisseur (nom + telephone)
   * - meta commande (numero + total)
   * Le nombre de lignes est compte separement (count).
   */
  async obtenirContexteEnvoiBdC(tenantId: string, commandeId: string) {
    const [row] = await this.db
      .select({
        commandeId: purchaseOrders.id,
        numeroCommande: purchaseOrders.orderNumber,
        montantTotal: purchaseOrders.totalAmount,
        statut: purchaseOrders.status,
        nomBoutique: tenants.name,
        nomFournisseur: suppliers.name,
        telephoneFournisseur: suppliers.phone,
      })
      .from(purchaseOrders)
      .innerJoin(tenants, eq(purchaseOrders.tenantId, tenants.id))
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(and(
        eq(purchaseOrders.id, commandeId),
        eq(purchaseOrders.tenantId, tenantId),
      ));
    if (!row) return null;
    const [countRow] = await this.db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, commandeId));
    return { ...row, nombreLignes: Number(countRow?.n ?? 0) };
  }

  /** Lignes + variante + produit (pour le rendu). */
  async listerLignesCommande(purchaseOrderId: string) {
    return this.db
      .select({
        id: purchaseOrderLines.id,
        variantId: purchaseOrderLines.variantId,
        productId: variants.productId,
        productName: products.name,
        variantName: variants.name,
        sku: variants.sku,
        quantityOrdered: purchaseOrderLines.quantityOrdered,
        quantityReceived: purchaseOrderLines.quantityReceived,
        unitPrice: purchaseOrderLines.unitPrice,
        lineTotal: purchaseOrderLines.lineTotal,
        // Phase A.4 : expose le CUMP actuel pour permettre la preview
        // "avant/apres" dans la modale de reception.
        cumpActuel: variants.priceLanded,
      })
      .from(purchaseOrderLines)
      .innerJoin(variants, eq(purchaseOrderLines.variantId, variants.id))
      .innerJoin(products, eq(variants.productId, products.id))
      .where(eq(purchaseOrderLines.purchaseOrderId, purchaseOrderId));
  }

  async modifierStatutCommande(
    tenantId: string,
    id: string,
    status: "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED" | "CANCELLED",
    receivedAt?: Date,
  ) {
    // Fix C6 : soft-delete automatique a l'annulation pour ne pas polluer
    // la liste active. La commande reste consultable via inclureAnnulees=true.
    const patch: Record<string, unknown> = { status, receivedAt, updatedAt: new Date() };
    if (status === "CANCELLED") patch.deletedAt = new Date();
    const [row] = await this.db
      .update(purchaseOrders)
      .set(patch)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
      .returning();
    return row;
  }

  async modifierLigneRecue(lineId: string, nouveauRecu: string) {
    await this.db
      .update(purchaseOrderLines)
      .set({ quantityReceived: nouveauRecu })
      .where(eq(purchaseOrderLines.id, lineId));
  }

  /**
   * Mouvement STOCK_IN cree au moment d'une reception. Pas de gestion lot
   * (PERISHABLE) ici : pour les produits perissables, il faut passer par
   * /stock/entree qui force le numero de lot et la date d'expiration.
   */
  async enregistrerEntreeReception(data: {
    tenantId: string;
    variantId: string;
    locationId: string;
    quantity: string;
    userId: string;
    purchaseOrderId: string;
    orderNumber: string;
  }) {
    const [row] = await this.db.insert(stockMovements).values({
      tenantId: data.tenantId,
      variantId: data.variantId,
      locationId: data.locationId,
      movementType: "STOCK_IN",
      quantity: data.quantity,
      userId: data.userId,
      referenceType: "PURCHASE_ORDER",
      referenceId: data.purchaseOrderId,
      note: `Reception ${data.orderNumber}`,
    }).returning();
    return row;
  }

  /**
   * Met a jour le prix d'achat de la variante. Strategie simple : on
   * remplace par le dernier prix paye. (Une vraie moyenne ponderee serait
   * preferable a terme.)
   */
  async majPrixAchatVariante(variantId: string, prixAchat: string) {
    await this.db
      .update(variants)
      .set({ pricePurchase: prixAchat, updatedAt: new Date() })
      .where(eq(variants.id, variantId));
  }

  /**
   * Fix C1 : applique une reception ATOMIQUEMENT via `db.batch()`. Tous
   * les mouvements stock, mises a jour lignes, prix d'achat et statut
   * commande sont commits ensemble (un seul roundtrip Neon HTTP) ou pas
   * du tout. Evite la corruption "stock credite mais ligne non maj" si
   * une operation echoue au milieu.
   *
   * Limites : neon-http n'expose pas le pattern `transaction(async tx)`
   * (callback). On ne peut donc pas faire d'intermediate read dans la
   * transaction. Le caller doit lire les lignes JUSTE avant, calculer
   * les writes, puis appeler cette methode. Le risque residuel de race
   * (deux receptions simultanees de la meme commande) est documente
   * dans `AchatService.receptionner`.
   */
  async appliquerReceptionAtomique(data: {
    tenantId: string;
    commandeId: string;
    orderNumber: string;
    locationId: string;
    userId: string;
    mouvements: Array<{ variantId: string; quantity: string }>;
    lignes: Array<{ ligneId: string; quantiteRecue: string }>;
    prixAchat?: Array<{ variantId: string; prix: string }>;
    nouveauStatut?: "PARTIAL" | "RECEIVED";
    receivedAt?: Date;
  }): Promise<void> {
    const requetes: any[] = [];

    // 1. Inserts mouvements de stock
    for (const m of data.mouvements) {
      requetes.push(this.db.insert(stockMovements).values({
        tenantId: data.tenantId,
        variantId: m.variantId,
        locationId: data.locationId,
        movementType: "STOCK_IN",
        quantity: m.quantity,
        userId: data.userId,
        referenceType: "PURCHASE_ORDER",
        referenceId: data.commandeId,
        note: `Reception ${data.orderNumber}`,
      }));
    }

    // 2. Update quantites recues par ligne
    for (const l of data.lignes) {
      requetes.push(this.db.update(purchaseOrderLines)
        .set({ quantityReceived: l.quantiteRecue })
        .where(eq(purchaseOrderLines.id, l.ligneId)));
    }

    // 3. Update prix d'achat variantes si demande
    for (const p of (data.prixAchat ?? [])) {
      requetes.push(this.db.update(variants)
        .set({ pricePurchase: p.prix, updatedAt: new Date() })
        .where(eq(variants.id, p.variantId)));
    }

    // 4. Update statut commande si transition (PARTIAL / RECEIVED)
    if (data.nouveauStatut) {
      requetes.push(this.db.update(purchaseOrders)
        .set({
          status: data.nouveauStatut,
          receivedAt: data.receivedAt ?? undefined,
          updatedAt: new Date(),
        })
        .where(and(
          eq(purchaseOrders.id, data.commandeId),
          eq(purchaseOrders.tenantId, data.tenantId),
        )));
    }

    if (requetes.length === 0) return;
    // db.batch envoie tout en une transaction Neon (atomique : tout ou rien).
    await (this.db as any).batch(requetes);
  }

  // ─── Phase A.2 : frais d'approche (purchase_order_costs) ────────────────

  /**
   * Liste les frais d'approche d'une commande. Tri par categorie puis date
   * de creation pour rendu UI stable.
   */
  async listerFraisCommande(purchaseOrderId: string) {
    return this.db
      .select()
      .from(purchaseOrderCosts)
      .where(eq(purchaseOrderCosts.purchaseOrderId, purchaseOrderId))
      .orderBy(purchaseOrderCosts.category, purchaseOrderCosts.createdAt);
  }

  /**
   * Phase A.2 : ajoute un frais a une commande. Calcule amountInBase
   * (montant converti devise tenant) cote service pour figer la valeur
   * historique meme si le taux change apres.
   */
  async ajouterFraisCommande(data: {
    tenantId: string;
    purchaseOrderId: string;
    category: "TRANSPORT" | "CUSTOMS" | "TRANSIT" | "INSURANCE" | "HANDLING" | "OTHER";
    label: string;
    amount: string;
    currency: string;
    exchangeRate: string;
    amountInBase: string;
    notes?: string;
    createdBy?: string;
  }) {
    const [row] = await this.db.insert(purchaseOrderCosts).values(data).returning();
    return row;
  }

  async modifierFraisCommande(
    id: string,
    data: Partial<{
      category: "TRANSPORT" | "CUSTOMS" | "TRANSIT" | "INSURANCE" | "HANDLING" | "OTHER";
      label: string;
      amount: string;
      currency: string;
      exchangeRate: string;
      amountInBase: string;
      notes: string | null;
    }>,
  ) {
    const [row] = await this.db
      .update(purchaseOrderCosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(purchaseOrderCosts.id, id))
      .returning();
    return row;
  }

  async supprimerFraisCommande(id: string) {
    await this.db
      .delete(purchaseOrderCosts)
      .where(eq(purchaseOrderCosts.id, id));
  }

  /**
   * Phase A.2 : somme des frais en devise tenant pour une commande.
   * Utilise par le service pour ventiler sur les lignes au moment de
   * la reception et pour mettre a jour costs_total / landed_total.
   */
  async sommerFraisCommande(purchaseOrderId: string): Promise<number> {
    const [row] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${purchaseOrderCosts.amountInBase}::numeric), 0)`,
      })
      .from(purchaseOrderCosts)
      .where(eq(purchaseOrderCosts.purchaseOrderId, purchaseOrderId));
    return Number(row?.total ?? 0);
  }

  /**
   * Phase A.2 : met a jour le snapshot costs_total + landed_total
   * sur purchase_orders. A appeler apres chaque modif des frais.
   */
  async majTotauxCommande(
    purchaseOrderId: string,
    costsTotal: number,
    totalAmount: number,
  ): Promise<void> {
    await this.db
      .update(purchaseOrders)
      .set({
        costsTotal: costsTotal.toFixed(2),
        landedTotal: (Number(totalAmount) + costsTotal).toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, purchaseOrderId));
  }

  /**
   * Phase A.2 : applique le cout debarque calcule a une ligne. Le service
   * Landed Cost passe les valeurs deja calculees.
   */
  async majLandedLigne(
    lineId: string,
    landedUnitCost: string,
    landedTotalCost: string,
  ): Promise<void> {
    await this.db
      .update(purchaseOrderLines)
      .set({ landedUnitCost, landedTotalCost })
      .where(eq(purchaseOrderLines.id, lineId));
  }

  /**
   * Phase A.2 : recupere le CUMP courant et le stock global d'un variant
   * pour le calcul du nouveau CUMP a la reception.
   * Renvoie { stockExistant, cumpActuel } (les deux en number).
   */
  async obtenirContexteCump(tenantId: string, variantId: string) {
    // Stock total = SUM(quantity) — la colonne est deja signee
    // (negatif pour sorties, positif pour entrees) selon convention
    // event-sourcing. Voir stockTotalParVariante().
    const [stockRow] = await this.db
      .select({
        stock: sql<string>`COALESCE(SUM(${stockMovements.quantity}), 0)`,
      })
      .from(stockMovements)
      .where(and(
        eq(stockMovements.tenantId, tenantId),
        eq(stockMovements.variantId, variantId),
      ));

    const [variantRow] = await this.db
      .select({ cump: variants.priceLanded })
      .from(variants)
      .where(eq(variants.id, variantId))
      .limit(1);

    return {
      stockExistant: Number(stockRow?.stock ?? 0),
      cumpActuel: Number(variantRow?.cump ?? 0),
    };
  }

  /**
   * Phase A.2 : met a jour le CUMP du variant (price_landed) et
   * l'horodatage de la derniere maj. Appele apres calcul cote service.
   */
  async majCump(variantId: string, nouveauCump: string): Promise<void> {
    await this.db
      .update(variants)
      .set({
        priceLanded: nouveauCump,
        cumpLastUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(variants.id, variantId));
  }

  /**
   * Phase A.2 : recupere le poids d'un variant pour l'allocation WEIGHT.
   * Renvoie 0 si pas de poids defini (l'allocation tombera proportionnel
   * a la quantite par fallback dans le service).
   */
  async obtenirPoidsVariantes(variantIds: string[]): Promise<Map<string, number>> {
    if (variantIds.length === 0) return new Map();
    const rows = await this.db
      .select({ id: variants.id, weight: variants.weight })
      .from(variants)
      .where(inArray(variants.id, variantIds));
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.id, Number(r.weight ?? 0));
    return m;
  }
}
