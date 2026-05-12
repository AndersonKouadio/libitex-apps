import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsCron } from "./notifications.cron";
import { WhatsAppMetaProvider } from "./providers/whatsapp-meta.provider";
import { EmailNotificationProvider } from "./providers/email-notif.provider";
import { NotificationLogRepository } from "./repositories/notification-log.repository";
import { EmailModule } from "../../common/email/email.module";

/**
 * Module 10 D1+D3 : module de notifications. Expose NotificationsService
 * a importer dans les features qui declenchent des envois (vente,
 * reservation, achat...). Inclut un cron pour rappel reservation J-1
 * (D3) et un controller admin pour la page parametres.
 */
@Module({
  imports: [
    EmailModule,
    // ScheduleModule.forRoot() est idempotent : si deja appele ailleurs,
    // pas de probleme. On l'appelle ici parce que c'est ce module qui
    // declare le premier cron.
    ScheduleModule.forRoot(),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsCron,
    WhatsAppMetaProvider,
    EmailNotificationProvider,
    NotificationLogRepository,
  ],
  exports: [NotificationsService, WhatsAppMetaProvider, EmailNotificationProvider],
})
export class NotificationsModule {}
