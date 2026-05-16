import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { DevisRepository } from "./repositories/devis.repository";
import { AuditService, AUDIT_ACTIONS } from "../../common/audit/audit.service";
import {
  CreerDevisDto, ModifierDevisDto, ListerDevisQueryDto,
  LigneDevisCreationDto, DevisResumeDto, DevisDetailDto, LigneDevisResponseDto,
} from "./dto/devis.dto";
import { PaginatedResponseDto } from "../../common/dto/api-response.dto";

/** États terminaux : aucune transition possible. */
const ETATS_TERMINAUX = new Set(["REFUSED", "EXPIRED", "CONVERTED", "CANCELLED"]);

/**
 * Machine d'états du devis. Source de vérité pour les transitions autorisées.
 * Toute transition non listée jette une BadRequestException.
 */
const TRANSITIONS: Record<string, Set<string>> = {
  DRAFT:     new Set(["SENT", "CANCELLED"]),
  SENT:      new Set(["ACCEPTED", "REFUSED", "EXPIRED", "CANCELLED"]),
  ACCEPTED:  new Set(["CONVERTED", "CANCELLED"]),
  REFUSED:   new Set(),
  EXPIRED:   new Set(),
  CONVERTED: new Set(),
  CANCELLED: new Set(),
};

@Injectable()
export class DevisService {
  constructor(
    private readonly repo: DevisRepository,
    private readonly audit: AuditService,
  ) {}

  // ─── Création ──────────────────────────────────────────────────────────

  async creer(tenantId: string, userId: string, dto: CreerDevisDto): Promise<DevisDetailDto> {
    const validJusquau = new Date(dto.validJusquau);
    if (validJusquau.getTime() <= Date.now()) {
      throw new BadRequestException("La date de validité doit être postérieure à aujourd'hui");
    }

    const numero = await this.repo.genererNumero(tenantId);
    const devis = await this.repo.creer({
      tenantId,
      quoteNumber: numero,
      customerId: dto.clientId,
      validUntil: validJusquau,
      paymentTerms: dto.conditionsPaiement,
      deliveryTerms: dto.conditionsLivraison,
      internalNotes: dto.notesInternes,
      customerNotes: dto.notesClient,
      createdBy: userId,
    });

    // Resolution + insertion des lignes avec snapshot produit
    const lignesPrep = await this.preparerLignes(tenantId, dto.lignes);
    await this.repo.ajouterLignes(devis.id, lignesPrep);
    await this.repo.recalculerTotaux(devis.id, String(dto.remiseGlobale ?? 0));

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_IN, // réutilisation tag générique
      entityType: "QUOTE", entityId: devis.id,
      after: { numero, clientId: dto.clientId, nbLignes: dto.lignes.length },
    });

    return this.obtenir(tenantId, devis.id);
  }

  /**
   * Convertit les lignes DTO en lignes DB avec snapshot produit et calcul
   * des totaux ligne (subtotal, tax, total). Garantit l'immutabilité du
   * devis envoyé même si le catalogue change.
   */
  private async preparerLignes(tenantId: string, lignes: LigneDevisCreationDto[]) {
    const prep = [];
    for (let i = 0; i < lignes.length; i++) {
      const l = lignes[i]!;
      let sku: string | null = null;
      let nomProduit = l.nomProduit ?? null;
      let nomVariante: string | null = null;
      let prixUnitaire = l.prixUnitaire;
      let tauxTva = l.tauxTva ?? 0;

      if (l.varianteId) {
        const v = await this.repo.obtenirVarianteAvecProduit(tenantId, l.varianteId);
        if (!v) throw new NotFoundException(`Variante introuvable: ${l.varianteId}`);
        sku = v.sku;
        nomProduit = nomProduit ?? v.productName;
        nomVariante = v.variantName;
        prixUnitaire = prixUnitaire ?? Number(v.unitPrice);
        if (l.tauxTva === undefined) tauxTva = Number(v.taxRate ?? 0);
      }

      if (!nomProduit) {
        throw new BadRequestException(
          `Ligne ${i + 1}: nom produit requis (soit via varianteId, soit explicite)`,
        );
      }
      if (prixUnitaire === undefined || prixUnitaire < 0) {
        throw new BadRequestException(`Ligne ${i + 1}: prix unitaire requis`);
      }

      const remise = l.remise ?? 0;
      const subtotal = l.quantite * prixUnitaire - remise;
      const tax = subtotal * (tauxTva / 100);
      const total = subtotal + tax;

      prep.push({
        variantId: l.varianteId ?? null,
        sku,
        productName: nomProduit,
        variantName: nomVariante,
        description: l.description ?? null,
        position: i + 1,
        quantity: String(l.quantite),
        unitPrice: String(prixUnitaire),
        discount: String(remise),
        taxRate: String(tauxTva),
        lineSubtotal: String(Math.max(0, subtotal)),
        lineTax: String(Math.max(0, tax)),
        lineTotal: String(Math.max(0, total)),
      });
    }
    return prep;
  }

  // ─── Lecture ───────────────────────────────────────────────────────────

  async lister(
    tenantId: string,
    query: ListerDevisQueryDto,
  ): Promise<PaginatedResponseDto<DevisResumeDto>> {
    const { rows, total } = await this.repo.lister(tenantId, {
      page: query.page,
      limit: query.limit,
      statut: query.statut,
      clientId: query.clientId,
      dateDebut: query.dateDebut ? new Date(query.dateDebut + "T00:00:00.000Z") : undefined,
      dateFin: query.dateFin ? new Date(query.dateFin + "T23:59:59.999Z") : undefined,
      recherche: query.recherche,
    });

    const items: DevisResumeDto[] = rows.map((r) => ({
      id: r.id,
      numero: r.quoteNumber,
      statut: r.status,
      dateEmission: r.issueDate,
      validJusquau: r.validUntil,
      sousTotal: Number(r.subtotal ?? 0),
      totalTva: Number(r.taxAmount ?? 0),
      remiseGlobale: Number(r.discountAmount ?? 0),
      total: Number(r.total ?? 0),
      clientId: r.customerId,
      nomClient: [r.prenomClient, r.nomClient].filter(Boolean).join(" ") || null,
      telephoneClient: r.telephoneClient,
      envoyeLe: r.sentAt,
      reponduLe: r.respondedAt,
      convertiLe: r.convertedAt,
      creeLe: r.createdAt,
    }));

    return PaginatedResponseDto.create(items, total, query.page, query.limit);
  }

  async obtenir(tenantId: string, id: string): Promise<DevisDetailDto> {
    const devis = await this.repo.trouverParId(tenantId, id);
    if (!devis) throw new NotFoundException("Devis introuvable");

    const lignes = await this.repo.obtenirLignes(id);
    const lignesDto: LigneDevisResponseDto[] = lignes.map((l) => ({
      id: l.id,
      position: l.position,
      varianteId: l.variantId,
      sku: l.sku,
      nomProduit: l.productName,
      nomVariante: l.variantName,
      description: l.description,
      quantite: Number(l.quantity),
      prixUnitaire: Number(l.unitPrice),
      remise: Number(l.discount),
      tauxTva: Number(l.taxRate),
      sousTotalLigne: Number(l.lineSubtotal),
      tvaLigne: Number(l.lineTax),
      totalLigne: Number(l.lineTotal),
    }));

    return {
      id: devis.id,
      numero: devis.quoteNumber,
      statut: devis.status,
      dateEmission: devis.issueDate,
      validJusquau: devis.validUntil,
      sousTotal: Number(devis.subtotal ?? 0),
      totalTva: Number(devis.taxAmount ?? 0),
      remiseGlobale: Number(devis.discountAmount ?? 0),
      total: Number(devis.total ?? 0),
      clientId: devis.customerId,
      nomClient: [devis.prenomClient, devis.nomClient].filter(Boolean).join(" ") || null,
      telephoneClient: devis.telephoneClient,
      emailClient: devis.emailClient,
      adresseClient: devis.adresseClient,
      conditionsPaiement: devis.paymentTerms,
      conditionsLivraison: devis.deliveryTerms,
      notesInternes: devis.internalNotes,
      notesClient: devis.customerNotes,
      envoyeLe: devis.sentAt,
      reponduLe: devis.respondedAt,
      convertiLe: devis.convertedAt,
      convertiVersFactureId: devis.convertedToInvoiceId,
      prenomAuteur: devis.prenomAuteur,
      nomAuteur: devis.nomAuteur,
      creeLe: devis.createdAt,
      modifieLe: devis.updatedAt,
      lignes: lignesDto,
    };
  }

  // ─── Modification (DRAFT only) ─────────────────────────────────────────

  async modifier(
    tenantId: string, userId: string, id: string, dto: ModifierDevisDto,
  ): Promise<DevisDetailDto> {
    const existant = await this.repo.trouverParId(tenantId, id);
    if (!existant) throw new NotFoundException("Devis introuvable");
    if (existant.status !== "DRAFT") {
      throw new BadRequestException(
        `Impossible de modifier un devis ${existant.status}. Seuls les devis en brouillon sont modifiables.`,
      );
    }

    await this.repo.modifierHeader(tenantId, id, {
      customerId: dto.clientId,
      validUntil: dto.validJusquau ? new Date(dto.validJusquau) : undefined,
      paymentTerms: dto.conditionsPaiement,
      deliveryTerms: dto.conditionsLivraison,
      internalNotes: dto.notesInternes,
      customerNotes: dto.notesClient,
      discountAmount: dto.remiseGlobale !== undefined ? String(dto.remiseGlobale) : undefined,
    });

    if (dto.lignes && dto.lignes.length > 0) {
      await this.repo.supprimerLignes(id);
      const lignesPrep = await this.preparerLignes(tenantId, dto.lignes);
      await this.repo.ajouterLignes(id, lignesPrep);
    }

    // Recalcul total toujours, car remise globale ou lignes peuvent avoir change
    const remiseFinal = dto.remiseGlobale !== undefined
      ? String(dto.remiseGlobale)
      : String(existant.discountAmount ?? 0);
    await this.repo.recalculerTotaux(id, remiseFinal);

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_IN,
      entityType: "QUOTE", entityId: id,
      after: { modification: true, lignesRemplacees: !!dto.lignes },
    });

    return this.obtenir(tenantId, id);
  }

  // ─── Transitions d'état ────────────────────────────────────────────────

  private verifierTransition(courant: string, cible: string) {
    if (ETATS_TERMINAUX.has(courant)) {
      throw new BadRequestException(`Le devis est dans un état terminal (${courant}) — aucune transition possible.`);
    }
    const autorisees = TRANSITIONS[courant];
    if (!autorisees || !autorisees.has(cible)) {
      throw new BadRequestException(
        `Transition interdite : ${courant} → ${cible}. Transitions autorisées : ${[...(autorisees ?? [])].join(", ") || "aucune"}`,
      );
    }
  }

  async envoyer(tenantId: string, userId: string, id: string): Promise<DevisDetailDto> {
    const devis = await this.repo.trouverParId(tenantId, id);
    if (!devis) throw new NotFoundException("Devis introuvable");
    this.verifierTransition(devis.status, "SENT");
    await this.repo.changerStatut(tenantId, id, "SENT", { sentAt: new Date() });
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_IN,
      entityType: "QUOTE", entityId: id, after: { transition: "DRAFT->SENT" },
    });
    return this.obtenir(tenantId, id);
  }

  async accepter(tenantId: string, userId: string, id: string): Promise<DevisDetailDto> {
    const devis = await this.repo.trouverParId(tenantId, id);
    if (!devis) throw new NotFoundException("Devis introuvable");
    this.verifierTransition(devis.status, "ACCEPTED");
    await this.repo.changerStatut(tenantId, id, "ACCEPTED", { respondedAt: new Date() });
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_IN,
      entityType: "QUOTE", entityId: id, after: { transition: "SENT->ACCEPTED" },
    });
    return this.obtenir(tenantId, id);
  }

  async refuser(tenantId: string, userId: string, id: string): Promise<DevisDetailDto> {
    const devis = await this.repo.trouverParId(tenantId, id);
    if (!devis) throw new NotFoundException("Devis introuvable");
    this.verifierTransition(devis.status, "REFUSED");
    await this.repo.changerStatut(tenantId, id, "REFUSED", { respondedAt: new Date() });
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_IN,
      entityType: "QUOTE", entityId: id, after: { transition: "SENT->REFUSED" },
    });
    return this.obtenir(tenantId, id);
  }

  async annuler(tenantId: string, userId: string, id: string): Promise<DevisDetailDto> {
    const devis = await this.repo.trouverParId(tenantId, id);
    if (!devis) throw new NotFoundException("Devis introuvable");
    this.verifierTransition(devis.status, "CANCELLED");
    await this.repo.changerStatut(tenantId, id, "CANCELLED");
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_IN,
      entityType: "QUOTE", entityId: id, after: { transition: `${devis.status}->CANCELLED` },
    });
    return this.obtenir(tenantId, id);
  }

  // ─── Suppression (DRAFT/CANCELLED only) ────────────────────────────────

  async supprimer(tenantId: string, userId: string, id: string): Promise<void> {
    const devis = await this.repo.trouverParId(tenantId, id);
    if (!devis) throw new NotFoundException("Devis introuvable");
    if (devis.status !== "DRAFT" && devis.status !== "CANCELLED") {
      throw new BadRequestException(
        `Impossible de supprimer un devis ${devis.status}. Annulez-le d'abord ou conservez-le pour l'historique.`,
      );
    }
    await this.repo.supprimer(tenantId, id);
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_IN,
      entityType: "QUOTE", entityId: id, after: { suppression: true, statutAuMomentSuppression: devis.status },
    });
  }

  // ─── Duplication ───────────────────────────────────────────────────────

  /**
   * Crée un nouveau devis en DRAFT à partir d'un existant. Reprend client,
   * lignes, conditions ; la date de validité est portée à +30 jours.
   */
  async dupliquer(tenantId: string, userId: string, id: string): Promise<DevisDetailDto> {
    const source = await this.repo.trouverParId(tenantId, id);
    if (!source) throw new NotFoundException("Devis source introuvable");

    const lignes = await this.repo.obtenirLignes(id);
    const validJusquau = new Date();
    validJusquau.setDate(validJusquau.getDate() + 30);

    const numero = await this.repo.genererNumero(tenantId);
    const copie = await this.repo.creer({
      tenantId,
      quoteNumber: numero,
      customerId: source.customerId,
      validUntil: validJusquau,
      paymentTerms: source.paymentTerms ?? undefined,
      deliveryTerms: source.deliveryTerms ?? undefined,
      internalNotes: source.internalNotes ?? undefined,
      customerNotes: source.customerNotes ?? undefined,
      createdBy: userId,
    });

    // Re-snapshot identique mais avec nouveau quoteId
    await this.repo.ajouterLignes(copie.id, lignes.map((l) => ({
      variantId: l.variantId,
      sku: l.sku,
      productName: l.productName,
      variantName: l.variantName,
      description: l.description,
      position: l.position,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
      taxRate: l.taxRate,
      lineSubtotal: l.lineSubtotal,
      lineTax: l.lineTax,
      lineTotal: l.lineTotal,
    })));
    await this.repo.recalculerTotaux(copie.id, String(source.discountAmount ?? 0));

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_IN,
      entityType: "QUOTE", entityId: copie.id,
      after: { duplique: true, source: source.id, numero },
    });

    return this.obtenir(tenantId, copie.id);
  }
}
