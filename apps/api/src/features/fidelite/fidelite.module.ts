import { Module } from "@nestjs/common";
import { FideliteController } from "./fidelite.controller";
import { FideliteService } from "./fidelite.service";
import { FideliteRepository } from "./repositories/fidelite.repository";

@Module({
  controllers: [FideliteController],
  providers: [FideliteService, FideliteRepository],
  exports: [FideliteService],
})
export class FideliteModule {}
