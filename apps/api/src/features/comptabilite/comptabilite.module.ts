import { Module } from "@nestjs/common";
import { ComptabiliteController } from "./comptabilite.controller";
import { ComptabiliteService } from "./comptabilite.service";
import { ComptabiliteRepository } from "./repositories/comptabilite.repository";

@Module({
  controllers: [ComptabiliteController],
  providers: [ComptabiliteService, ComptabiliteRepository],
  exports: [ComptabiliteService],
})
export class ComptabiliteModule {}
