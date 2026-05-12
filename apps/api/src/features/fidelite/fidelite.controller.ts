import {
  Controller, Get, Patch, Post, Body, Param,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { FideliteService } from "./fidelite.service";
import { ModifierConfigFideliteDto, AjusterPointsDto } from "./dto/fidelite.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("Fidelite")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("fidelite")
export class FideliteController {
  constructor(private readonly service: FideliteService) {}

  @Get("config")
  @ApiOperation({ summary: "Obtenir la configuration du programme fidelite" })
  obtenirConfig(@CurrentUser() user: CurrentUserData) {
    return this.service.obtenirConfig(user.tenantId);
  }

  @Patch("config")
  @ApiOperation({ summary: "Modifier la configuration (activer, ratios)" })
  @Roles("ADMIN", "MANAGER")
  modifierConfig(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ModifierConfigFideliteDto,
  ) {
    return this.service.modifierConfig(user.tenantId, dto);
  }

  @Get("clients/:customerId/solde")
  @ApiOperation({ summary: "Solde de points + equivalent en F CFA" })
  solde(
    @CurrentUser() user: CurrentUserData,
    @Param("customerId") customerId: string,
  ) {
    return this.service.solde(user.tenantId, customerId);
  }

  @Get("clients/:customerId/historique")
  @ApiOperation({ summary: "Historique des transactions de points d'un client" })
  historique(
    @CurrentUser() user: CurrentUserData,
    @Param("customerId") customerId: string,
  ) {
    return this.service.historique(user.tenantId, customerId);
  }

  @Post("clients/:customerId/ajuster")
  @ApiOperation({ summary: "Ajustement manuel de points (+/-)" })
  @Roles("ADMIN", "MANAGER")
  ajuster(
    @CurrentUser() user: CurrentUserData,
    @Param("customerId") customerId: string,
    @Body() dto: AjusterPointsDto,
  ) {
    return this.service.ajusterPoints(user.tenantId, user.userId, customerId, dto);
  }
}
