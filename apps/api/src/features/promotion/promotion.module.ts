import { Module } from "@nestjs/common";
import { PromotionController } from "./promotion.controller";
import { PromotionService } from "./promotion.service";
import { PromotionRepository } from "./repositories/promotion.repository";
import { AuditModule } from "../../common/audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [PromotionController],
  providers: [PromotionService, PromotionRepository],
  exports: [PromotionService],
})
export class PromotionModule {}
