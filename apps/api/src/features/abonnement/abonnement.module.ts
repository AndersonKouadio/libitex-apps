import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AbonnementController } from "./abonnement.controller";
import { AbonnementService } from "./abonnement.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AbonnementController],
  providers: [AbonnementService],
  exports: [AbonnementService],
})
export class AbonnementModule {}
