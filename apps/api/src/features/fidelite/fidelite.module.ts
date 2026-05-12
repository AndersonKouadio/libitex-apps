import { Module } from "@nestjs/common";
import { FideliteController } from "./fidelite.controller";
import { FideliteService } from "./fidelite.service";
import { FideliteRepository } from "./repositories/fidelite.repository";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [RealtimeModule],
  controllers: [FideliteController],
  providers: [FideliteService, FideliteRepository],
  exports: [FideliteService],
})
export class FideliteModule {}
