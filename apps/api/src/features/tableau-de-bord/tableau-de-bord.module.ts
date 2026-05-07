import { Module } from "@nestjs/common";
import { TableauDeBordController } from "./tableau-de-bord.controller";
import { TableauDeBordService } from "./tableau-de-bord.service";
import { TableauDeBordRepository } from "./repositories/tableau-de-bord.repository";

@Module({
  controllers: [TableauDeBordController],
  providers: [TableauDeBordService, TableauDeBordRepository],
  exports: [TableauDeBordService],
})
export class TableauDeBordModule {}
