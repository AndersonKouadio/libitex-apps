import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { WhatsAppMetaProvider } from "./providers/whatsapp-meta.provider";
import { EmailNotificationProvider } from "./providers/email-notif.provider";
import { NotificationLogRepository } from "./repositories/notification-log.repository";
import { EmailModule } from "../../common/email/email.module";

/**
 * Module 10 D1 : module de notifications. Expose NotificationsService
 * a importer dans les features qui declenchent des envois (vente,
 * reservation, achat...).
 */
@Module({
  imports: [EmailModule],
  providers: [
    NotificationsService,
    WhatsAppMetaProvider,
    EmailNotificationProvider,
    NotificationLogRepository,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
