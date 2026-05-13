import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
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
import { FideliteModule } from "./features/fidelite/fidelite.module";
import { ShowcaseModule } from "./features/showcase/showcase.module";
import { PromotionModule } from "./features/promotion/promotion.module";
import { ReservationModule } from "./features/reservation/reservation.module";
import { RealtimeModule } from "./features/realtime/realtime.module";
import { HealthModule } from "./features/health/health.module";
import { NotificationsModule } from "./features/notifications/notifications.module";
import { LocationSettingsModule } from "./features/location-settings/location-settings.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    /**
     * Fix C1 Module 7 : rate limiting global avec 2 niveaux. Le "short"
     * sert pour les endpoints publics (showcase, login) qui peuvent etre
     * abuses. Le "default" plus genereux pour les calls authentifies.
     *
     * Limites par IP. NestJS Throttler stocke en memoire (suffisant pour
     * 1 instance ; pour multi-instance future, passer le storage Redis).
     */
    ThrottlerModule.forRoot([
      // Short : 30 req / 10s — protege le showcase d'un scraper
      { name: "short", ttl: 10000, limit: 30 },
      // Default : 100 req / minute — couvre les usages normaux POS
      { name: "default", ttl: 60000, limit: 100 },
    ]),
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
    FideliteModule,
    ShowcaseModule,
    PromotionModule,
    ReservationModule,
    HealthModule,
    NotificationsModule,
    LocationSettingsModule,
  ],
  providers: [
    // Active le ThrottlerGuard globalement. Les routes peuvent override
    // via @Throttle({ short: {...} }) ou @SkipThrottle().
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
