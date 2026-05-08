import { Injectable, Logger } from "@nestjs/common";
import { AuditRepository, type AuditLogInsert } from "./audit.repository";

/**
 * Liste centralisee des actions auditables. Format `{ENTITY}_{ACTION}`.
 * Aligne sur les actions sensibles enumerees dans le DSF §8.2 et §14.4 du
 * document complet (modification stock manuelle, annulation ticket,
 * connexion, modification de prix, suppression...).
 */
export const AUDIT_ACTIONS = {
  // Auth
  USER_LOGIN: "USER_LOGIN",
  USER_LOGIN_FAILED: "USER_LOGIN_FAILED",
  TENANT_CREATED: "TENANT_CREATED",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  // Catalogue
  PRODUIT_CREATED: "PRODUIT_CREATED",
  PRODUIT_UPDATED: "PRODUIT_UPDATED",
  PRODUIT_DELETED: "PRODUIT_DELETED",
  // Stock
  STOCK_IN: "STOCK_IN",
  STOCK_ADJUSTED: "STOCK_ADJUSTED",
  STOCK_TRANSFERRED: "STOCK_TRANSFERRED",
  // Ingredient
  INGREDIENT_CREATED: "INGREDIENT_CREATED",
  INGREDIENT_UPDATED: "INGREDIENT_UPDATED",
  INGREDIENT_DELETED: "INGREDIENT_DELETED",
  INGREDIENT_RECEIVED: "INGREDIENT_RECEIVED",
  INGREDIENT_ADJUSTED: "INGREDIENT_ADJUSTED",
  // Vente
  TICKET_CREATED: "TICKET_CREATED",
  TICKET_COMPLETED: "TICKET_COMPLETED",
  TICKET_PARKED: "TICKET_PARKED",
  TICKET_VOIDED: "TICKET_VOIDED",
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly repo: AuditRepository) {}

  /**
   * Enregistre une action sensible. Ne lance jamais d'exception : un echec
   * d'audit ne doit pas bloquer l'operation metier (best-effort + log).
   */
  async log(params: AuditLogInsert): Promise<void> {
    try {
      await this.repo.inserer(params);
    } catch (err) {
      this.logger.error(
        `Audit log failed for ${params.action} on ${params.entityType}:${params.entityId ?? "-"}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /** Helper pour les creations : action `{ENTITY}_CREATED` avec snapshot apres. */
  async logCreate(tenantId: string, userId: string, entityType: string, entityId: string, after: unknown, ip?: string): Promise<void> {
    await this.log({
      tenantId, userId,
      action: `${entityType}_CREATED`,
      entityType, entityId, after, ip,
    });
  }

  /** Helper pour les modifications : action `{ENTITY}_UPDATED` avec before/after. */
  async logUpdate(tenantId: string, userId: string, entityType: string, entityId: string, before: unknown, after: unknown, ip?: string): Promise<void> {
    await this.log({
      tenantId, userId,
      action: `${entityType}_UPDATED`,
      entityType, entityId, before, after, ip,
    });
  }

  /** Helper pour les suppressions : action `{ENTITY}_DELETED` avec snapshot avant. */
  async logDelete(tenantId: string, userId: string, entityType: string, entityId: string, before: unknown, ip?: string): Promise<void> {
    await this.log({
      tenantId, userId,
      action: `${entityType}_DELETED`,
      entityType, entityId, before, ip,
    });
  }

  /** Lecture paginee. Reservee aux admins (controller doit faire le RBAC). */
  async lister(tenantId: string, page: number, limit: number, filtres: {
    entityType?: string; entityId?: string; userId?: string;
  } = {}) {
    const offset = (page - 1) * limit;
    return this.repo.lister(tenantId, { ...filtres, limit, offset });
  }
}
