import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "../../../common/email/email.service";
import type { EnvoiNotification, NotificationProvider, ResultatEnvoi } from "./notification.provider";

/**
 * Module 10 D1 : wrapper du EmailService existant pour exposer
 * l'interface NotificationProvider unifiee. Permet au service de
 * notifications de traiter email et whatsapp de la meme facon.
 */
@Injectable()
export class EmailNotificationProvider implements NotificationProvider {
  readonly canal = "email";

  constructor(
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  get disponible(): boolean {
    // Le EmailService a son propre fallback log si SMTP_HOST manquant,
    // donc il est "disponible" dans tous les cas (mais peut juste loguer).
    return Boolean(this.config.get<string>("SMTP_HOST"));
  }

  async envoyer(envoi: EnvoiNotification): Promise<ResultatEnvoi> {
    try {
      await this.emailService.envoyer({
        destinataire: envoi.destinataire,
        sujet: envoi.sujet ?? "Notification LIBITEX",
        texte: envoi.texte,
        html: envoi.html,
      });
      return { succes: true };
    } catch (err) {
      return { succes: false, erreur: err instanceof Error ? err.message : String(err) };
    }
  }
}
