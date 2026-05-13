import {
  Injectable, BadRequestException, NotFoundException, ConflictException, Logger,
} from "@nestjs/common";
import { PromotionRepository } from "./repositories/promotion.repository";
import {
  CreerPromotionDto, ModifierPromotionDto, ValiderCodeDto,
  PromotionResponseDto, ValidationResultDto,
} from "./dto/promotion.dto";
import { AuditService, AUDIT_ACTIONS } from "../../common/audit/audit.service";

@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(
    private readonly repo: PromotionRepository,
    private readonly audit: AuditService,
  ) {}

  async creer(
    tenantId: string, userId: string, dto: CreerPromotionDto,
  ): Promise<PromotionResponseDto> {
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

    // Module 11 D1 (I3) : audit log creation promo
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.PROMOTION_CREATED,
      entityType: "PROMOTION", entityId: row.id,
      after: { code, type: dto.type, valeur: dto.valeur },
    });

    return this.map(row);
  }

  async lister(tenantId: string): Promise<PromotionResponseDto[]> {
    const rows = await this.repo.lister(tenantId);
    return rows.map((r) => this.map(r));
  }

  async modifier(
    tenantId: string, userId: string, id: string, dto: ModifierPromotionDto,
  ): Promise<PromotionResponseDto> {
    const existant = await this.repo.trouverParId(tenantId, id);
    if (!existant) throw new NotFoundException("Promotion introuvable");

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

    // Module 11 D1 (I3) : audit log modification
    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.PROMOTION_UPDATED,
      entityType: "PROMOTION", entityId: id,
      before: { code: existant.code, isActive: existant.isActive },
      after: data,
    });

    return this.map(row);
  }

  async supprimer(tenantId: string, userId: string, id: string): Promise<void> {
    const existant = await this.repo.trouverParId(tenantId, id);
    if (!existant) throw new NotFoundException("Promotion introuvable");
    await this.repo.supprimer(tenantId, id);

    await this.audit.log({
      tenantId, userId, action: AUDIT_ACTIONS.PROMOTION_DELETED,
      entityType: "PROMOTION", entityId: id,
      before: { code: existant.code },
    });
  }

  /**
   * Valide un code au moment ou le caissier le saisit dans le panier.
   * Renvoie `valide:false + raison` si KO. Sinon `valide:true + remise:N`.
   *
   * N'enregistre PAS l'usage — c'est appliquerAuTicketEnVerifiant() qui
   * le fait au moment de la completion du ticket (sinon un caissier
   * qui annule consommerait quand meme un usage).
   */
  async valider(tenantId: string, dto: ValiderCodeDto): Promise<ValidationResultDto> {
    return this.evaluerCode(tenantId, dto.code, dto.montantTicket, dto.clientId);
  }

  /**
   * Module 11 D1 : evaluation pure du code (re-utilisable cote panier
   * ET cote completerTicket). Verifie toutes les conditions metier.
   */
  private async evaluerCode(
    tenantId: string, code: string, montantTicket: number, clientId?: string,
  ): Promise<ValidationResultDto> {
    const promo = await this.repo.trouverParCode(tenantId, code.trim());
    if (!promo || promo.deletedAt) {
      return { valide: false, raison: "Code inconnu", remise: 0 };
    }
    if (!promo.isActive) {
      return { valide: false, raison: "Code desactive", remise: 0 };
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
    if (montantMin > 0 && montantTicket < montantMin) {
      return {
        valide: false,
        raison: `Montant minimum ${montantMin.toLocaleString("fr-FR")} F requis`,
        remise: 0,
      };
    }

    if (clientId && promo.perCustomerLimit !== null) {
      const usages = await this.repo.compterUsagesClient(promo.id, clientId);
      if (usages >= promo.perCustomerLimit) {
        return { valide: false, raison: "Limite client atteinte", remise: 0 };
      }
    }

    const remise = this.calculerRemise(promo, montantTicket);
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
    if (promo.maxDiscountAmount !== null) {
      remise = Math.min(remise, Number(promo.maxDiscountAmount));
    }
    remise = Math.min(remise, montantTicket);
    return Number(remise.toFixed(2));
  }

  /**
   * Module 11 D1 (fix C1+C2+I2+I3) : applique la promo a un ticket AU
   * MOMENT DE LA COMPLETION. Refait toute la validation cote serveur,
   * recalcule la remise (ne fait pas confiance au front), incremente
   * usage atomiquement (race-safe), enregistre l'usage et log audit.
   *
   * Retourne le montant de remise EFFECTIVEMENT applique (que VenteService
   * doit utiliser pour le ticket final, pas la valeur du front). Si le
   * code est invalide a ce moment, retourne 0 et log audit failed.
   *
   * Ne leve JAMAIS. Tous les echecs sont absorbed pour que la vente
   * continue (avec remise 0 si la promo a expire entre saisie et
   * completion).
   */
  async appliquerAuTicketEnVerifiant(
    tenantId: string,
    userId: string,
    code: string,
    ticketId: string,
    customerId: string | undefined,
    montantTicket: number,
  ): Promise<number> {
    try {
      const verdict = await this.evaluerCode(tenantId, code, montantTicket, customerId);
      if (!verdict.valide || !verdict.promotion) {
        await this.audit.log({
          tenantId, userId, action: AUDIT_ACTIONS.PROMOTION_APPLY_FAILED,
          entityType: "TICKET", entityId: ticketId,
          after: { code, raison: verdict.raison },
        });
        this.logger.warn(
          `Promotion ${code} refusee au completer ticket ${ticketId}: ${verdict.raison}`,
        );
        return 0;
      }

      // Fix C1 : increment atomique cote DB. Si la limite globale a ete
      // atteinte par un autre caissier entre la validation et maintenant,
      // l'UPDATE renvoie 0 row -> on echoue cleanly.
      const incremente = await this.repo.incrementerUsageAtomique(verdict.promotion.id);
      if (!incremente) {
        await this.audit.log({
          tenantId, userId, action: AUDIT_ACTIONS.PROMOTION_APPLY_FAILED,
          entityType: "TICKET", entityId: ticketId,
          after: { code, raison: "Limite globale atteinte (race)" },
        });
        return 0;
      }

      // Enregistre l'usage pour traçabilite + permettre decrementer si
      // annulation (Module 11 D2).
      await this.repo.enregistrerUsage({
        promotionId: verdict.promotion.id,
        tenantId,
        customerId,
        ticketId,
        discountAmount: verdict.remise.toString(),
      });

      await this.audit.log({
        tenantId, userId, action: AUDIT_ACTIONS.PROMOTION_APPLIED,
        entityType: "TICKET", entityId: ticketId,
        after: {
          code: verdict.promotion.code,
          promotionId: verdict.promotion.id,
          remise: verdict.remise,
        },
      });

      return verdict.remise;
    } catch (err) {
      // Best-effort : log mais ne propage pas
      this.logger.error(
        `Echec applique promotion ${code} sur ticket ${ticketId}: ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
      return 0;
    }
  }

  /**
   * Module 11 D2 : libere les usages d'un ticket annule (decrement
   * compteur). Appele par VenteService.annuler() si le ticket avait
   * des promo_usages enregistres.
   */
  async libererUsagesTicket(tenantId: string, ticketId: string): Promise<void> {
    try {
      const usages = await this.repo.usagesParTicket(ticketId);
      for (const u of usages) {
        await this.repo.decrementerUsage(u.promotionId);
      }
      if (usages.length > 0) {
        await this.repo.supprimerUsagesTicket(ticketId);
      }
    } catch (err) {
      this.logger.error(
        `Echec liberation usages ticket ${ticketId}: ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * @deprecated Module 11 D1 : ancienne version conservee pour
   * compatibilite. Le nouveau hook dans VenteService doit utiliser
   * `appliquerAuTicketEnVerifiant` qui retourne le montant a appliquer.
   */
  async appliquerAuTicket(
    tenantId: string,
    code: string,
    ticketId: string,
    customerId: string | undefined,
    montantTicket: number,
  ): Promise<void> {
    await this.appliquerAuTicketEnVerifiant(
      tenantId, "system", code, ticketId, customerId, montantTicket,
    );
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
