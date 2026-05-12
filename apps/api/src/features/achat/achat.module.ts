import { Module } from "@nestjs/common";
import { AchatController } from "./achat.controller";
import { AchatService } from "./achat.service";
import { AchatRepository } from "./repositories/achat.repository";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [RealtimeModule],
  controllers: [AchatController],
  providers: [AchatService, AchatRepository],
  exports: [AchatService],
})
export class AchatModule {}
