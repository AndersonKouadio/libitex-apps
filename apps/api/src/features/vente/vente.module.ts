import { Module } from "@nestjs/common";
import { StockModule } from "../stock/stock.module";
import { IngredientModule } from "../ingredient/ingredient.module";
import { VenteController } from "./vente.controller";
import { VenteService } from "./vente.service";
import { TicketRepository } from "./repositories/ticket.repository";

@Module({
  imports: [StockModule, IngredientModule],
  controllers: [VenteController],
  providers: [VenteService, TicketRepository],
  exports: [VenteService],
})
export class VenteModule {}
