import { Module } from "@nestjs/common";
import { StockModule } from "../stock/stock.module";
import { VenteController } from "./vente.controller";
import { VenteService } from "./vente.service";
import { TicketRepository } from "./repositories/ticket.repository";

@Module({
  imports: [StockModule],
  controllers: [VenteController],
  providers: [VenteService, TicketRepository],
  exports: [VenteService],
})
export class VenteModule {}
