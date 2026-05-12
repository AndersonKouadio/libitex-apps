import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { StockRepository } from "./repositories/stock.repository";
import { StockInsuffisantException } from "../../common/exceptions/metier.exception";
import { AuditService, AUDIT_ACTIONS } from "../../common/audit/audit.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import {
  CreerEmplacementDto, ModifierEmplacementDto, EntreeStockDto,
  AjustementStockDto, TransfertStockDto, AppliquerInventaireDto, InventaireResultatDto,
  EmplacementResponseDto, StockActuelResponseDto, MouvementResponseDto,
} from "./dto/stock.dto";

@Injectable()
export class StockService {
  constructor(
    private readonly stockRepo: StockRepository,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Helper : broadcast stock.updated + disponibilites.changed pour un emplacement. */
  private notifierChangementStock(tenantId: string, locationId: string): void {
    this.realtime.emitToTenant(tenantId, "stock.updated", { emplacementId: locationId });
    this.realtime.emitToTenant(tenantId, "disponibilites.changed", { emplacementId: locationId });
  }

  async creerEmplacement(tenantId: string, dto: CreerEmplacementDto): Promise<EmplacementResponseDto> {
    const emp = await this.stockRepo.creerEmplacement(tenantId, {
      name: dto.nom, type: dto.type, address: dto.adresse,
    });
    return { id: emp.id, nom: emp.name, type: emp.type, adresse: emp.address };
  }

  async listerEmplacements(tenantId: string): Promise<EmplacementResponseDto[]> {
    const emps = await this.stockRepo.listerEmplacements(tenantId);
    return emps.map((e) => ({ id: e.id, nom: e.name, type: e.type, adresse: e.address }));
  }

  async modifierEmplacement(
    tenantId: string,
    id: string,
    dto: ModifierEmplacementDto,
  ): Promise<EmplacementResponseDto> {
    const existant = await this.stockRepo.trouverEmplacement(tenantId, id);
    if (!existant) throw new NotFoundException("Emplacement introuvable");

    const updated = await this.stockRepo.modifierEmplacement(tenantId, id, {
      name: dto.nom,
      type: dto.type,
      address: dto.adresse,
    });
    return { id: updated.id, nom: updated.name, type: updated.type, adresse: updated.address };
  }

  async supprimerEmplacement(tenantId: string, id: string): Promise<void> {
    const existant = await this.stockRepo.trouverEmplacement(tenantId, id);
    if (!existant) throw new NotFoundException("Emplacement introuvable");

    // Garde-fou : refus si l'emplacement contient encore du stock (variantes ou ingredients).
    // On verifie la somme algebrique des mouvements (entrees - sorties).
    const stock = await this.stockRepo.sommeStockEmplacement(tenantId, id);
    if (stock !== 0) {
      throw new BadRequestException(
        `Impossible de supprimer : l'emplacement contient encore ${stock} unité${Math.abs(stock) > 1 ? "s" : ""} en stock. Transférez ou ajustez d'abord.`,
      );
    }

    // Verifier qu'il reste au moins un autre emplacement actif (pour pouvoir vendre).
    const autres = await this.stockRepo.listerEmplacements(tenantId);
    if (autres.length <= 1) {
      throw new BadRequestException(
        "Impossible de supprimer le seul emplacement de la boutique. Créez-en un autre d'abord.",
      );
    }

    await this.stockRepo.supprimerEmplacement(tenantId, id);
  }

  async entreeStock(tenantId: string, userId: string, dto: EntreeStockDto): Promise<MouvementResponseDto> {
    // Pour les produits PERISHABLE, un lot doit etre cree a la reception
    // (numero + date d'expiration). Sinon le POS ne peut pas vendre (FEFO).
    const variante = await this.stockRepo.obtenirVarianteAvecProduit(dto.varianteId);
    let batchId: string | undefined;

    if (variante?.productType === "PERISHABLE") {
      if (!dto.numeroLot || !dto.dateExpiration) {
        throw new BadRequestException(
          `${variante.productName} est un produit périssable : numéro de lot et date d'expiration requis a la réception.`,
        );
      }
      const lot = await this.stockRepo.creerLot({
        variantId: dto.varianteId,
        batchNumber: dto.numeroLot,
        expiryDate: dto.dateExpiration,
        quantityRemaining: dto.quantite,
      });
      batchId = lot.id;
    }

    const mvt = await this.stockRepo.enregistrerMouvement({
      tenantId, variantId: dto.varianteId, locationId: dto.emplacementId,
      movementType: "STOCK_IN", quantity: dto.quantite.toString(), userId, note: dto.note,
      batchId,
    });
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_IN,
      entityType: "STOCK", entityId: mvt.id,
      after: {
        varianteId: dto.varianteId,
        emplacementId: dto.emplacementId,
        quantite: dto.quantite,
        note: dto.note,
        ...(batchId ? { numeroLot: dto.numeroLot, dateExpiration: dto.dateExpiration } : {}),
      },
    });
    this.notifierChangementStock(tenantId, dto.emplacementId);
    return this.mapMouvement(mvt);
  }

  async sortieStock(
    tenantId: string, userId: string, variantId: string, locationId: string,
    quantity: number, refType?: string, refId?: string, serialId?: string, batchId?: string,
  ): Promise<MouvementResponseDto> {
    const stockActuel = await this.stockRepo.obtenirStockActuel(tenantId, variantId, locationId);
    if (stockActuel < quantity) {
      throw new StockInsuffisantException(stockActuel, quantity);
    }

    const mvt = await this.stockRepo.enregistrerMouvement({
      tenantId, variantId, locationId,
      movementType: "STOCK_OUT", quantity: (-quantity).toString(), userId,
      referenceType: refType, referenceId: refId, serialId, batchId,
    });
    return this.mapMouvement(mvt);
  }

  async ajuster(tenantId: string, userId: string, dto: AjustementStockDto): Promise<MouvementResponseDto> {
    const stockAvant = await this.stockRepo.obtenirStockActuel(
      tenantId, dto.varianteId, dto.emplacementId,
    );
    const mvt = await this.stockRepo.enregistrerMouvement({
      tenantId, variantId: dto.varianteId, locationId: dto.emplacementId,
      movementType: "ADJUSTMENT", quantity: dto.quantite.toString(), userId, note: dto.note,
    });
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_ADJUSTED,
      entityType: "STOCK", entityId: mvt.id,
      before: { quantiteAvant: stockAvant },
      after: {
        varianteId: dto.varianteId,
        emplacementId: dto.emplacementId,
        delta: dto.quantite,
        note: dto.note,
      },
    });
    this.notifierChangementStock(tenantId, dto.emplacementId);
    return this.mapMouvement(mvt);
  }

  async transferer(tenantId: string, userId: string, dto: TransfertStockDto) {
    const stockActuel = await this.stockRepo.obtenirStockActuel(
      tenantId, dto.varianteId, dto.depuisEmplacementId,
    );
    if (stockActuel < dto.quantite) {
      throw new StockInsuffisantException(stockActuel, dto.quantite);
    }

    await this.stockRepo.enregistrerMouvement({
      tenantId, variantId: dto.varianteId, locationId: dto.depuisEmplacementId,
      movementType: "TRANSFER_OUT", quantity: (-dto.quantite).toString(), userId, note: dto.note,
    });
    await this.stockRepo.enregistrerMouvement({
      tenantId, variantId: dto.varianteId, locationId: dto.versEmplacementId,
      movementType: "TRANSFER_IN", quantity: dto.quantite.toString(), userId, note: dto.note,
    });

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_TRANSFERRED,
      entityType: "STOCK", entityId: dto.varianteId,
      after: {
        depuisEmplacementId: dto.depuisEmplacementId,
        versEmplacementId: dto.versEmplacementId,
        quantite: dto.quantite,
        note: dto.note,
      },
    });
    // 2 emplacements impactes par le transfert
    this.notifierChangementStock(tenantId, dto.depuisEmplacementId);
    this.notifierChangementStock(tenantId, dto.versEmplacementId);
  }

  async obtenirStockActuel(
    tenantId: string, variantId: string, locationId: string,
  ): Promise<StockActuelResponseDto> {
    const quantite = await this.stockRepo.obtenirStockActuel(tenantId, variantId, locationId);
    return { varianteId: variantId, emplacementId: locationId, quantite };
  }

  async obtenirStockParEmplacement(tenantId: string, locationId: string) {
    const rows = await this.stockRepo.obtenirStockParEmplacement(tenantId, locationId);
    return rows.map((r) => ({
      varianteId: r.variantId,
      sku: r.sku,
      nomProduit: r.nomProduit,
      nomVariante: r.nomVariante,
      typeProduit: r.typeProduit,
      quantite: Number(r.quantite),
      prixAchat: Number(r.prixAchat ?? 0),
    }));
  }

  /**
   * Applique un inventaire complet sur un emplacement : pour chaque ligne
   * comptee, calcule l'ecart vs le stock theorique et cree un mouvement
   * ADJUSTMENT si delta != 0. Les lignes a delta=0 sont comptees comme
   * "inchangees". La justification est partagee pour toutes les lignes.
   */
  async appliquerInventaire(
    tenantId: string,
    userId: string,
    dto: AppliquerInventaireDto,
  ): Promise<InventaireResultatDto> {
    let ajustements = 0;
    let inchanges = 0;

    for (const ligne of dto.lignes) {
      const stockActuel = await this.stockRepo.obtenirStockActuel(
        tenantId, ligne.varianteId, dto.emplacementId,
      );
      const delta = ligne.quantiteReelle - stockActuel;
      if (delta === 0) {
        inchanges += 1;
        continue;
      }
      await this.stockRepo.enregistrerMouvement({
        tenantId,
        variantId: ligne.varianteId,
        locationId: dto.emplacementId,
        movementType: "ADJUSTMENT",
        quantity: delta.toString(),
        userId,
        note: dto.justification,
      });
      ajustements += 1;
    }

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_INVENTORY_APPLIED,
      entityType: "STOCK", entityId: dto.emplacementId,
      after: {
        emplacementId: dto.emplacementId,
        justification: dto.justification,
        lignesComptees: dto.lignes.length,
        ajustements,
        inchanges,
      },
    });

    if (ajustements > 0) this.notifierChangementStock(tenantId, dto.emplacementId);
    return { ajustements, inchanges, total: dto.lignes.length };
  }

  async listerMouvements(
    tenantId: string,
    query: {
      page?: number; pageSize?: number; type?: string;
      varianteId?: string; emplacementId?: string;
      dateDebut?: string; dateFin?: string;
    },
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const dateDebut = query.dateDebut ? new Date(query.dateDebut) : undefined;
    // Inclure toute la journee de fin : passer a 23:59:59.999.
    let dateFin: Date | undefined;
    if (query.dateFin) {
      dateFin = new Date(query.dateFin);
      dateFin.setHours(23, 59, 59, 999);
    }

    const { rows, total } = await this.stockRepo.listerMouvements(tenantId, {
      page, pageSize, type: query.type,
      varianteId: query.varianteId, emplacementId: query.emplacementId,
      dateDebut, dateFin,
    });

    return {
      data: rows.map((r) => ({
        id: r.id,
        type: r.movementType,
        quantite: Number(r.quantity),
        note: r.note,
        creeLe: r.createdAt?.toISOString?.() ?? r.createdAt,
        varianteId: r.variantId,
        sku: r.sku,
        nomProduit: r.nomProduit,
        nomVariante: r.nomVariante,
        emplacementId: r.locationId,
        nomEmplacement: r.nomEmplacement,
        auteur: r.prenomAuteur || r.nomAuteur
          ? `${r.prenomAuteur ?? ""} ${r.nomAuteur ?? ""}`.trim()
          : null,
      })),
      meta: {
        page, pageSize, total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  private mapMouvement(raw: any): MouvementResponseDto {
    return {
      id: raw.id,
      typeMouvement: raw.movementType,
      quantite: Number(raw.quantity),
      note: raw.note,
      creeLe: raw.createdAt?.toISOString?.() ?? raw.createdAt,
    };
  }
}
