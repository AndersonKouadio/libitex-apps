import { Module, Global } from "@nestjs/common";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { AuditRepository } from "./audit.repository";

/**
 * Module audit @Global() — l'AuditService est injectable dans tout service
 * sans avoir a importer AuditModule dans chaque feature module.
 */
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}
