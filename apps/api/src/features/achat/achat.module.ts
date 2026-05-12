import { Module } from "@nestjs/common";
import { AchatController } from "./achat.controller";
import { AchatService } from "./achat.service";
import { AchatRepository } from "./repositories/achat.repository";
import { RealtimeModule } from "../realtime/realtime.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [RealtimeModule, NotificationsModule],
  controllers: [AchatController],
  providers: [AchatService, AchatRepository],
  exports: [AchatService],
})
export class AchatModule {}
