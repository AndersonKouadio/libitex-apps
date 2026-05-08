import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { AuditService } from "./audit.service";
import { PaginationDto } from "../dto/pagination.dto";
import { CurrentUser, CurrentUserData } from "../decorators/current-user.decorator";
import { RolesGuard, Roles } from "../guards/roles.guard";

@ApiTags("Audit")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("audit-logs")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: "Lister les logs d'audit du tenant (admin/manager seulement)" })
  @ApiQuery({ name: "entityType", required: false, description: "Filtrer par type (TICKET, STOCK, PRODUIT...)" })
  @ApiQuery({ name: "entityId", required: false })
  @ApiQuery({ name: "userId", required: false })
  @Roles("ADMIN", "MANAGER")
  lister(
    @CurrentUser() user: CurrentUserData,
    @Query() pagination: PaginationDto,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
    @Query("userId") userId?: string,
  ) {
    return this.auditService.lister(user.tenantId, pagination.page, pagination.limit, {
      entityType, entityId, userId,
    });
  }
}
