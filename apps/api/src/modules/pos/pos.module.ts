import { Module } from "@nestjs/common";
import { PosController } from "./pos.controller";
import { PosService } from "./pos.service";
import { StockModule } from "../stock/stock.module";

@Module({
  imports: [StockModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
