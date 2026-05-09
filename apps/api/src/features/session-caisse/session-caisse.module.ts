import { Module, forwardRef } from "@nestjs/common";
import { SessionCaisseController } from "./session-caisse.controller";
import { SessionCaisseService } from "./session-caisse.service";
import { CashSessionRepository } from "./repositories/cash-session.repository";
import { VenteModule } from "../vente/vente.module";

@Module({
  // forwardRef car VenteModule importe SessionCaisseService (creerTicket
  // verifie qu'une session est ouverte avant de continuer).
  imports: [forwardRef(() => VenteModule)],
  controllers: [SessionCaisseController],
  providers: [SessionCaisseService, CashSessionRepository],
  exports: [SessionCaisseService, CashSessionRepository],
})
export class SessionCaisseModule {}
