import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { AuditModule } from "./common/audit/audit.module";
import { EmailModule } from "./common/email/email.module";
import { AuthModule } from "./features/auth/auth.module";
import { CatalogueModule } from "./features/catalogue/catalogue.module";
import { StockModule } from "./features/stock/stock.module";
import { VenteModule } from "./features/vente/vente.module";
import { SessionCaisseModule } from "./features/session-caisse/session-caisse.module";
import { TableauDeBordModule } from "./features/tableau-de-bord/tableau-de-bord.module";
import { BoutiqueModule } from "./features/boutique/boutique.module";
import { UploadModule } from "./features/upload/upload.module";
import { IngredientModule } from "./features/ingredient/ingredient.module";
import { EquipeModule } from "./features/equipe/equipe.module";
import { ClientModule } from "./features/client/client.module";
import { AchatModule } from "./features/achat/achat.module";
import { RealtimeModule } from "./features/realtime/realtime.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    DatabaseModule,
    AuditModule,
    EmailModule,
    RealtimeModule,
    AuthModule,
    CatalogueModule,
    StockModule,
    VenteModule,
    SessionCaisseModule,
    TableauDeBordModule,
    BoutiqueModule,
    UploadModule,
    IngredientModule,
    EquipeModule,
    ClientModule,
    AchatModule,
  ],
})
export class AppModule {}
