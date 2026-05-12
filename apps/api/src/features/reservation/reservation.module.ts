import { Module } from "@nestjs/common";
import { ReservationController } from "./reservation.controller";
import { ReservationService } from "./reservation.service";
import { ReservationRepository } from "./repositories/reservation.repository";
import { RealtimeModule } from "../realtime/realtime.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [RealtimeModule, NotificationsModule],
  controllers: [ReservationController],
  providers: [ReservationService, ReservationRepository],
  exports: [ReservationService],
})
export class ReservationModule {}
