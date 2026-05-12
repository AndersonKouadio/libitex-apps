import { Module, forwardRef } from "@nestjs/common";
import { StockModule } from "../stock/stock.module";
import { IngredientModule } from "../ingredient/ingredient.module";
import { CatalogueModule } from "../catalogue/catalogue.module";
import { SessionCaisseModule } from "../session-caisse/session-caisse.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { FideliteModule } from "../fidelite/fidelite.module";
import { PromotionModule } from "../promotion/promotion.module";
import { VenteController } from "./vente.controller";
import { VenteService } from "./vente.service";
import { TicketRepository } from "./repositories/ticket.repository";

@Module({
  imports: [
    StockModule,
    IngredientModule,
    CatalogueModule,
    RealtimeModule,
    FideliteModule,
    PromotionModule,
    forwardRef(() => SessionCaisseModule),
  ],
  controllers: [VenteController],
  providers: [VenteService, TicketRepository],
  exports: [VenteService, TicketRepository],
})
export class VenteModule {}
