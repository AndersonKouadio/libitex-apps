import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AchatRepository } from "./repositories/achat.repository";
import {
  CreerFournisseurDto, ModifierFournisseurDto, FournisseurResponseDto,
  CreerCommandeDto, ReceptionCommandeDto, ModifierStatutCommandeDto,
  CommandeResponseDto, LigneCommandeResponseDto,
} from "./dto/achat.dto";
import { RealtimeGateway } from "../realtime/realtime.gateway";

@Injectable()
export class AchatService {
  constructor(
    private readonly achatRepo: AchatRepository,
    private readonly realtime: RealtimeGateway,
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
    const fournisseur = await this.achatRepo.trouverFournisseur(tenantId, dto.fournisseurId);
    if (!fournisseur) throw new BadRequestException("Fournisseur introuvable");

    // Fix I9 : emplacement doit appartenir au tenant
    const emplacement = await this.achatRepo.emplacementDuTenant(tenantId, dto.emplacementId);
    if (!emplacement) {
      throw new ForbiddenException("Emplacement introuvable ou inaccessible");
    }

    // Fix C3 : verifier que toutes les variantes appartiennent au tenant
    const variantIds = dto.lignes.map((l) => l.varianteId);
    const valides = await this.achatRepo.variantesDuTenant(tenantId, variantIds);
    const intrus = variantIds.filter((id) => !valides.has(id));
    if (intrus.length > 0) {
      throw new ForbiddenException(
        `Variante(s) inaccessible(s) ou hors tenant : ${intrus.slice(0, 3).join(", ")}${intrus.length > 3 ? "..." : ""}`,
      );
    }

    const total = dto.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);

    // Fix C4 : retry-on-conflict. Deux callers simultanes peuvent calculer
    // le meme numero ; la contrainte UNIQUE rejette le 2e, on retry avec
    // le suivant.
    let commande;
    for (let attempt = 0; attempt < AchatService.MAX_RETRIES_NUMERO; attempt += 1) {
      const orderNumber = await this.achatRepo.prochainNumeroCommande(tenantId);
      try {
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
          // Conflit detecte -> retry avec le numero suivant
          continue;
        }
        throw err;
      }
    }
    if (!commande) {
      throw new BadRequestException("Echec de generation du numero de commande (concurrence trop forte)");
    }

    await this.achatRepo.ajouterLignes(dto.lignes.map((l) => ({
      purchaseOrderId: commande!.id,
      variantId: l.varianteId,
      quantityOrdered: l.quantite.toString(),
      unitPrice: l.prixUnitaire.toFixed(2),
      lineTotal: (l.quantite * l.prixUnitaire).toFixed(2),
    })));

    // Realtime : notifie les autres postes de l'apparition d'une nouvelle
    // commande (filtree cote front sur tenantId).
    this.realtime.emitToTenant(tenantId, "commande.creee", { id: commande.id });

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
      statut: r.status,
      montantTotal: Number(r.totalAmount),
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
    const lignes = await this.achatRepo.listerLignesCommande(id);

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
      totalLigne: Number(l.lineTotal),
    }));

    return {
      id: commande.id,
      numero: commande.orderNumber,
      fournisseurId: commande.supplierId,
      nomFournisseur: fournisseur?.name ?? "",
      emplacementId: commande.locationId,
      statut: commande.status,
      montantTotal: Number(commande.totalAmount),
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
        prixAchatMaj.push({
          variantId: ligne.variantId,
          prix: ligne.unitPrice,
        });
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
}
