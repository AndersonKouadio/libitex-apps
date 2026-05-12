import { Module } from "@nestjs/common";
import { CatalogueController } from "./catalogue.controller";
import { CatalogueService } from "./catalogue.service";
import { ProduitRepository } from "./repositories/produit.repository";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [RealtimeModule],
  controllers: [CatalogueController],
  providers: [CatalogueService, ProduitRepository],
  exports: [CatalogueService, ProduitRepository],
})
export class CatalogueModule {}
