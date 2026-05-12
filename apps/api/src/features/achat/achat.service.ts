import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
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

  async creerCommande(
    tenantId: string,
    userId: string,
    dto: CreerCommandeDto,
  ): Promise<CommandeResponseDto> {
    const fournisseur = await this.achatRepo.trouverFournisseur(tenantId, dto.fournisseurId);
    if (!fournisseur) throw new BadRequestException("Fournisseur introuvable");

    const total = dto.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
    const orderNumber = await this.achatRepo.genererNumeroCommande(tenantId);
    const commande = await this.achatRepo.creerCommande({
      tenantId,
      orderNumber,
      supplierId: dto.fournisseurId,
      locationId: dto.emplacementId,
      expectedDate: dto.dateAttendue ? new Date(dto.dateAttendue) : undefined,
      notes: dto.notes,
      createdBy: userId,
      totalAmount: total.toFixed(2),
    });
    await this.achatRepo.ajouterLignes(dto.lignes.map((l) => ({
      purchaseOrderId: commande.id,
      variantId: l.varianteId,
      quantityOrdered: l.quantite.toString(),
      unitPrice: l.prixUnitaire.toFixed(2),
      lineTotal: (l.quantite * l.prixUnitaire).toFixed(2),
    })));
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
   * Reception (totale ou partielle) d'une commande. Pour chaque ligne avec
   * quantite > 0, on cree un mouvement STOCK_IN, on cumule sur
   * quantityReceived, et on met a jour le statut global :
   *  - tout recu -> RECEIVED + receivedAt
   *  - partiel -> PARTIAL (receivedAt = premiere reception)
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
      throw new BadRequestException(`Commande ${commande.status === "RECEIVED" ? "deja recue" : "annulee"}`);
    }

    const lignes = await this.achatRepo.listerLignesCommande(id);
    const parId = new Map(lignes.map((l) => [l.id, l]));

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

      await this.achatRepo.enregistrerEntreeReception({
        tenantId,
        variantId: ligne.variantId,
        locationId: commande.locationId,
        quantity: recue.quantite.toString(),
        userId,
        purchaseOrderId: id,
        orderNumber: commande.orderNumber,
      });
      await this.achatRepo.modifierLigneRecue(ligne.id, cumule.toString());

      if (dto.majPrixAchat) {
        await this.achatRepo.majPrixAchatVariante(ligne.variantId, ligne.unitPrice);
      }
    }

    // Etat global apres reception
    const lignesApres = await this.achatRepo.listerLignesCommande(id);
    const totalCommande = lignesApres.reduce((s, l) => s + Number(l.quantityOrdered), 0);
    const totalRecu = lignesApres.reduce((s, l) => s + Number(l.quantityReceived), 0);
    const proche = (a: number, b: number) => Math.abs(a - b) < 0.001;
    const tout = proche(totalRecu, totalCommande);
    const partiel = totalRecu > 0 && !tout;

    if (tout) {
      await this.achatRepo.modifierStatutCommande(tenantId, id, "RECEIVED", new Date());
    } else if (partiel) {
      await this.achatRepo.modifierStatutCommande(
        tenantId,
        id,
        "PARTIAL",
        commande.receivedAt ?? new Date(),
      );
    }

    // Invalide stock POS sur tous les postes
    this.realtime.emitToTenant(tenantId, "stock.updated", { locationId: commande.locationId });
    this.realtime.emitToTenant(tenantId, "disponibilites.changed", { locationId: commande.locationId });

    return this.obtenirCommande(tenantId, id);
  }
}
