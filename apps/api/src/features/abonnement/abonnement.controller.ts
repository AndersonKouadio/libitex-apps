import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { SubscriptionPlan } from "@libitex/shared";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { Roles, RolesGuard } from "../../common/guards/roles.guard";
import { AbonnementService } from "./abonnement.service";

class ChangerPlanDto {
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;
}

@ApiTags("Abonnement")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("abonnement")
export class AbonnementController {
  constructor(private readonly service: AbonnementService) {}

  @Get()
  @ApiOperation({ summary: "État de l'abonnement (plan, statut, limites, usage)" })
  obtenir(@CurrentUser() user: CurrentUserData) {
    return this.service.obtenirAbonnement(user.tenantId);
  }

  @Get("plans")
  @ApiOperation({ summary: "Liste des plans disponibles avec limites + prix" })
  listerPlans() {
    return this.service.listerPlans();
  }

  @Post("changer-plan")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Change le plan souscrit (upgrade / downgrade)" })
  changerPlan(@CurrentUser() user: CurrentUserData, @Body() dto: ChangerPlanDto) {
    return this.service.changerPlan(user.tenantId, dto.plan);
  }
}
