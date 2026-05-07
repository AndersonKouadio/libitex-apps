import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BoutiqueController } from "./boutique.controller";
import { BoutiqueService } from "./boutique.service";

@Module({
  imports: [AuthModule],
  controllers: [BoutiqueController],
  providers: [BoutiqueService],
  exports: [BoutiqueService],
})
export class BoutiqueModule {}
