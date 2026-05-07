import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./features/auth/auth.module";
import { CatalogueModule } from "./features/catalogue/catalogue.module";
import { StockModule } from "./features/stock/stock.module";
import { VenteModule } from "./features/vente/vente.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    DatabaseModule,
    AuthModule,
    CatalogueModule,
    StockModule,
    VenteModule,
  ],
})
export class AppModule {}
