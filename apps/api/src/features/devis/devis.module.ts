import { Module } from "@nestjs/common";
import { DevisController } from "./devis.controller";
import { DevisService } from "./devis.service";
import { DevisRepository } from "./repositories/devis.repository";

@Module({
  controllers: [DevisController],
  providers: [DevisService, DevisRepository],
  exports: [DevisService],
})
export class DevisModule {}
