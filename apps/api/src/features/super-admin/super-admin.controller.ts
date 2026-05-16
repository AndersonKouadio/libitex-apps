import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { SubscriptionPlan, SubscriptionStatus } from "@libitex/shared";
import { Roles, RolesGuard } from "../../common/guards/roles.guard";
import { SuperAdminService } from "./super-admin.service";

class BasculerStatutDto {
  @IsEnum(SubscriptionStatus)
  statut!: SubscriptionStatus;
}

class ForcerPlanDto {
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;
}

@ApiTags("Super Admin")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles("SUPER_ADMIN")
@Controller("super-admin")
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Get("tenants")
  @ApiOperation({ summary: "Liste tous les tenants avec metriques (super-admin)" })
  listerTenants(@Query("recherche") recherche?: string) {
    return this.service.listerTenants(recherche);
  }

  @Get("kpis")
  @ApiOperation({ summary: "KPIs globaux plateforme (nb tenants par statut, CA total, distribution plans)" })
  kpisGlobaux() {
    return this.service.kpisGlobaux();
  }

  @Patch("tenants/:id/statut")
  @ApiOperation({ summary: "Suspend / reactive un tenant" })
  basculerStatut(@Param("id") id: string, @Body() dto: BasculerStatutDto) {
    return this.service.basculerStatut(id, dto.statut);
  }

  @Patch("tenants/:id/plan")
  @ApiOperation({ summary: "Force le plan d'un tenant (override admin)" })
  forcerPlan(@Param("id") id: string, @Body() dto: ForcerPlanDto) {
    return this.service.forcerPlan(id, dto.plan);
  }
}
