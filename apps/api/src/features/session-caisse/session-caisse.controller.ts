import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { SessionCaisseService } from "./session-caisse.service";
import {
  OuvrirSessionDto, FermerSessionDto, ListerSessionsQueryDto,
} from "./dto/session-caisse.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("Session caisse")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("vente/sessions")
export class SessionCaisseController {
  constructor(private readonly service: SessionCaisseService) {}

  @Post()
  @ApiOperation({ summary: "Ouvrir une session de caisse" })
  @Roles("ADMIN", "MANAGER", "CASHIER")
  ouvrir(@CurrentUser() user: CurrentUserData, @Body() dto: OuvrirSessionDto) {
    return this.service.ouvrir(user.tenantId, user.userId, dto);
  }

  @Get("active")
  @ApiOperation({ summary: "Session active du caissier sur l'emplacement" })
  @ApiQuery({ name: "emplacementId", required: true })
  @Roles("ADMIN", "MANAGER", "CASHIER")
  active(
    @CurrentUser() user: CurrentUserData,
    @Query("emplacementId") emplacementId: string,
  ) {
    return this.service.obtenirActive(user.tenantId, user.userId, emplacementId);
  }

  @Get(":id/recapitulatif")
  @ApiOperation({ summary: "Recap fermeture (tickets en cours, ventilation)" })
  @Roles("ADMIN", "MANAGER", "CASHIER")
  recap(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.service.recapitulatifFermeture(user.tenantId, id);
  }

  @Post(":id/fermer")
  @ApiOperation({ summary: "Fermer la session" })
  @Roles("ADMIN", "MANAGER", "CASHIER")
  fermer(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: FermerSessionDto,
  ) {
    return this.service.fermer(user.tenantId, id, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Detail d'une session" })
  @Roles("ADMIN", "MANAGER", "CASHIER")
  obtenir(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.service.obtenir(user.tenantId, id);
  }

  @Get()
  @ApiOperation({ summary: "Lister les sessions (historique paginee)" })
  @Roles("ADMIN", "MANAGER")
  lister(@CurrentUser() user: CurrentUserData, @Query() query: ListerSessionsQueryDto) {
    return this.service.lister(user.tenantId, query);
  }
}
