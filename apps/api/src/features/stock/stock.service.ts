import { Injectable } from "@nestjs/common";
import { StockRepository } from "./repositories/stock.repository";
import { StockInsuffisantException } from "../../common/exceptions/metier.exception";
import { AuditService, AUDIT_ACTIONS } from "../../common/audit/audit.service";
import {
  CreerEmplacementDto, EntreeStockDto, AjustementStockDto, TransfertStockDto,
  EmplacementResponseDto, StockActuelResponseDto, MouvementResponseDto,
} from "./dto/stock.dto";

@Injectable()
export class StockService {
  constructor(
    private readonly stockRepo: StockRepository,
    private readonly audit: AuditService,
  ) {}

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

  async entreeStock(tenantId: string, userId: string, dto: EntreeStockDto): Promise<MouvementResponseDto> {
    const mvt = await this.stockRepo.enregistrerMouvement({
      tenantId, variantId: dto.varianteId, locationId: dto.emplacementId,
      movementType: "STOCK_IN", quantity: dto.quantite.toString(), userId, note: dto.note,
    });
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.STOCK_IN,
      entityType: "STOCK", entityId: mvt.id,
      after: {
        varianteId: dto.varianteId,
        emplacementId: dto.emplacementId,
        quantite: dto.quantite,
        note: dto.note,
      },
    });
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
    }));
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
