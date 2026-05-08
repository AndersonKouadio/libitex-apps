import { Module } from "@nestjs/common";
import { SupplementController } from "./supplement.controller";
import { SupplementService } from "./supplement.service";
import { SupplementRepository } from "./repositories/supplement.repository";

@Module({
  controllers: [SupplementController],
  providers: [SupplementService, SupplementRepository],
  exports: [SupplementService],
})
export class SupplementModule {}
