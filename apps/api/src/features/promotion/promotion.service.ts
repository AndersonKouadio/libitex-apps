import { Injectable, BadRequestException, NotFoundException, ConflictException } from "@nestjs/common";
import { PromotionRepository } from "./repositories/promotion.repository";
import {
  CreerPromotionDto, ModifierPromotionDto, ValiderCodeDto,
  PromotionResponseDto, ValidationResultDto,
} from "./dto/promotion.dto";

@Injectable()
export class PromotionService {
  constructor(private readonly repo: PromotionRepository) {}

  async creer(tenantId: string, dto: CreerPromotionDto): Promise<PromotionResponseDto> {
    const code = dto.code.trim().toUpperCase();
    const existant = await this.repo.trouverParCode(tenantId, code);
    if (existant) throw new ConflictException(`Le code "${code}" existe deja`);

    const row = await this.repo.creer({
      tenantId,
      code,
      description: dto.description,
      type: dto.type,
      value: dto.valeur.toString(),
      minPurchaseAmount: (dto.montantMin ?? 0).toString(),
      maxDiscountAmount: dto.remiseMax != null ? dto.remiseMax.toString() : null,
      validFrom: dto.dateDebut ? new Date(dto.dateDebut) : null,
      validTo: dto.dateFin ? new Date(dto.dateFin) : null,
      usageLimit: dto.limiteUtilisations ?? null,
      perCustomerLimit: dto.limiteParClient ?? null,
    });
    return this.map(row);
  }

  async lister(tenantId: string): Promise<PromotionResponseDto[]> {
    const rows = await this.repo.lister(tenantId);
    return rows.map((r) => this.map(r));
  }

  async modifier(
    tenantId: string,
    id: string,
    dto: ModifierPromotionDto,
  ): Promise<PromotionResponseDto> {
    const existant = await this.repo.trouverParId(tenantId, id);
    if (!existant) throw new NotFoundException("Promotion introuvable");

    // Si le code change, verifier l'unicite (case-insensitive).
    if (dto.code && dto.code.trim().toUpperCase() !== existant.code.toUpperCase()) {
      const collision = await this.repo.trouverParCode(tenantId, dto.code.trim());
      if (collision) throw new ConflictException(`Le code "${dto.code}" existe deja`);
    }

    const data: any = {};
    if (dto.code !== undefined) data.code = dto.code.trim().toUpperCase();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.valeur !== undefined) data.value = dto.valeur.toString();
    if (dto.montantMin !== undefined) data.minPurchaseAmount = dto.montantMin.toString();
    if (dto.remiseMax !== undefined) {
      data.maxDiscountAmount = dto.remiseMax === null ? null : dto.remiseMax.toString();
    }
    if (dto.dateDebut !== undefined) {
      data.validFrom = dto.dateDebut ? new Date(dto.dateDebut) : null;
    }
    if (dto.dateFin !== undefined) {
      data.validTo = dto.dateFin ? new Date(dto.dateFin) : null;
    }
    if (dto.limiteUtilisations !== undefined) data.usageLimit = dto.limiteUtilisations;
    if (dto.limiteParClient !== undefined) data.perCustomerLimit = dto.limiteParClient;
    if (dto.actif !== undefined) data.isActive = dto.actif;

    const row = await this.repo.modifier(tenantId, id, data);
    return this.map(row);
  }

  async supprimer(tenantId: string, id: string): Promise<void> {
    const existant = await this.repo.trouverParId(tenantId, id);
    if (!existant) throw new NotFoundException("Promotion introuvable");
    await this.repo.supprimer(tenantId, id);
  }

  /**
   * Valide un code au moment ou le caissier le saisit dans le panier.
   * Renvoie `valide:false + raison` si KO (date, limite, montant min...).
   * Sinon `valide:true + remise:N` (montant exact a deduire du ticket).
   *
   * N'enregistre PAS l'usage — c'est appliquerAuTicket() qui le fait au
   * moment de la cloture (sinon un caissier qui annule la vente
   * consommerait quand meme l'usage).
   */
  async valider(tenantId: string, dto: ValiderCodeDto): Promise<ValidationResultDto> {
    const promo = await this.repo.trouverParCode(tenantId, dto.code.trim());
    if (!promo) {
      return { valide: false, raison: "Code inconnu", remise: 0 };
    }
    if (!promo.isActive) {
      return { valide: false, raison: "Code desactive", remise: 0 };
    }
    if (promo.deletedAt) {
      return { valide: false, raison: "Code inconnu", remise: 0 };
    }

    const now = new Date();
    if (promo.validFrom && now < new Date(promo.validFrom)) {
      return { valide: false, raison: "Code pas encore actif", remise: 0 };
    }
    if (promo.validTo && now > new Date(promo.validTo)) {
      return { valide: false, raison: "Code expire", remise: 0 };
    }

    if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
      return { valide: false, raison: "Limite d'utilisations atteinte", remise: 0 };
    }

    const montantMin = Number(promo.minPurchaseAmount);
    if (montantMin > 0 && dto.montantTicket < montantMin) {
      return {
        valide: false,
        raison: `Montant minimum ${montantMin.toLocaleString("fr-FR")} F requis`,
        remise: 0,
      };
    }

    if (dto.clientId && promo.perCustomerLimit !== null) {
      const usages = await this.repo.compterUsagesClient(promo.id, dto.clientId);
      if (usages >= promo.perCustomerLimit) {
        return { valide: false, raison: "Limite client atteinte", remise: 0 };
      }
    }

    const remise = this.calculerRemise(promo, dto.montantTicket);
    return {
      valide: true,
      raison: null,
      remise,
      promotion: this.map(promo),
    };
  }

  private calculerRemise(promo: any, montantTicket: number): number {
    const valeur = Number(promo.value);
    let remise = 0;
    if (promo.type === "PERCENTAGE") {
      remise = (montantTicket * valeur) / 100;
    } else {
      remise = valeur;
    }
    // Plafond eventuel
    if (promo.maxDiscountAmount !== null) {
      remise = Math.min(remise, Number(promo.maxDiscountAmount));
    }
    // Ne peut pas excedér le ticket lui-meme
    remise = Math.min(remise, montantTicket);
    return Number(remise.toFixed(2));
  }

  /**
   * Applique la promo : enregistre l'usage + increment du compteur global.
   * A appeler par VenteService au moment de completerTicket si une promo
   * est attachee au ticket.
   */
  async appliquerAuTicket(
    tenantId: string,
    code: string,
    ticketId: string,
    customerId: string | undefined,
    montantTicket: number,
  ): Promise<void> {
    const result = await this.valider(tenantId, { code, montantTicket, clientId: customerId });
    if (!result.valide || !result.promotion) return;
    await this.repo.enregistrerUsage({
      promotionId: result.promotion.id,
      tenantId,
      customerId,
      ticketId,
      discountAmount: result.remise.toString(),
    });
    await this.repo.incrementerUsage(result.promotion.id);
  }

  private map(row: any): PromotionResponseDto {
    return {
      id: row.id,
      code: row.code,
      description: row.description,
      type: row.type,
      valeur: Number(row.value),
      montantMin: Number(row.minPurchaseAmount),
      remiseMax: row.maxDiscountAmount != null ? Number(row.maxDiscountAmount) : null,
      dateDebut: row.validFrom ? new Date(row.validFrom).toISOString() : null,
      dateFin: row.validTo ? new Date(row.validTo).toISOString() : null,
      limiteUtilisations: row.usageLimit,
      usageCount: row.usageCount,
      limiteParClient: row.perCustomerLimit,
      actif: row.isActive,
      creeLe: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    };
  }
}
