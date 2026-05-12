import { Injectable, Logger } from "@nestjs/common";
import { WhatsAppMetaProvider } from "./providers/whatsapp-meta.provider";
import { EmailNotificationProvider } from "./providers/email-notif.provider";
import { NotificationLogRepository } from "./repositories/notification-log.repository";
import { TEMPLATES_FR } from "./templates/fr";

/**
 * Module 10 D1 : service de notifications unifie.
 *
 * Responsabilites :
 * - Choisir le bon provider selon le canal (whatsapp/email)
 * - Loguer chaque envoi (notification_logs) avant + apres
 * - Respecter l'anti-doublon (deja envoye pour la meme entite/type)
 * - Best-effort : un echec d'envoi ne doit JAMAIS faire planter le flow
 *   metier appelant (vente, reservation). On log et on continue.
 *
 * Les services applicatifs (vente, reservation, achat) appellent ce
 * service apres avoir fini leur logique principale. Le hook ne bloque
 * pas la transaction principale.
 */
export type TypeNotification =
  | "ticket"
  | "reservation_created"
  | "reservation_reminder"
  | "reservation_status"
  | "purchase_order"
  | "promo"
  | "stock_alert"
  | "otp";

export type CanalNotification = "whatsapp" | "email";

interface OptionsEnvoi {
  tenantId: string;
  canal: CanalNotification;
  type: TypeNotification;
  destinataire: string;
  texte: string;
  sujet?: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  /** Si true, ne pas envoyer si une notif du meme type/entite existe deja
   *  (utile pour ticket/reservation pour eviter les doublons sur retry). */
  antiDoublon?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly whatsapp: WhatsAppMetaProvider,
    private readonly email: EmailNotificationProvider,
    private readonly logs: NotificationLogRepository,
  ) {}

  /**
   * Expose les templates FR pour que les callers puissent rendre le
   * texte sans dependance circulaire (notifs.envoyer({ texte: ... })).
   */
  templates = TEMPLATES_FR;

  /**
   * Envoie une notification et log le resultat. Ne leve JAMAIS — les
   * appelants metier doivent pouvoir continuer meme si l'envoi echoue.
   * Retourne true si succes provider, false sinon (pour info caller).
   */
  async envoyer(opts: OptionsEnvoi): Promise<boolean> {
    try {
      // Anti-doublon : check rapide avant d'inserer un nouveau log.
      if (opts.antiDoublon && opts.entityType && opts.entityId) {
        const deja = await this.logs.dejaEnvoye(
          opts.tenantId, opts.type, opts.entityType, opts.entityId,
        );
        if (deja) {
          this.logger.log(`Skip ${opts.type} pour ${opts.entityType}:${opts.entityId} (deja envoye)`);
          return false;
        }
      }

      // 1) Log pending
      const { id: logId } = await this.logs.inserer({
        tenantId: opts.tenantId,
        channel: opts.canal,
        type: opts.type,
        recipient: opts.destinataire,
        status: "pending",
        entityType: opts.entityType,
        entityId: opts.entityId,
        payload: opts.payload ?? { texte: opts.texte },
      });

      // 2) Choisir provider
      const provider = opts.canal === "whatsapp" ? this.whatsapp : this.email;

      // 3) Envoyer
      const resultat = await provider.envoyer({
        destinataire: opts.destinataire,
        texte: opts.texte,
        sujet: opts.sujet,
      });

      // 4) Mettre a jour le log
      if (resultat.succes) {
        await this.logs.marquerEnvoye(logId, resultat.providerMessageId);
        return true;
      }
      await this.logs.marquerEchoue(logId, resultat.erreur ?? "echec inconnu");
      return false;
    } catch (err) {
      // Toute exception ici (DB down, etc.) doit etre absorbee.
      // Le service appelant (vente, reservation) continue son flow.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Echec envoyer() ${opts.canal}/${opts.type}: ${message}`);
      return false;
    }
  }

  /**
   * Lister les notifications envoyees (pour page admin D3).
   */
  lister(tenantId: string, opts: { limit?: number; offset?: number } = {}) {
    return this.logs.lister(tenantId, opts);
  }
}
