import { Module } from "@nestjs/common";
import { AchatController } from "./achat.controller";
import { AchatService } from "./achat.service";
import { AchatRepository } from "./repositories/achat.repository";
import { LandedCostService } from "./services/landed-cost.service";
import { RealtimeModule } from "../realtime/realtime.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [RealtimeModule, NotificationsModule],
  controllers: [AchatController],
  providers: [AchatService, AchatRepository, LandedCostService],
  exports: [AchatService, LandedCostService],
})
export class AchatModule {}
