import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { TableauDeBordService } from "./tableau-de-bord.service";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";

@ApiTags("Tableau de bord")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("tableau-de-bord")
export class TableauDeBordController {
  constructor(private readonly service: TableauDeBordService) {}

  @Get("kpis")
  @ApiOperation({ summary: "Indicateurs cles de la journee (recettes, tickets, ticket moyen, catalogue, emplacements)" })
  kpis(@CurrentUser() user: CurrentUserData) {
    return this.service.kpis(user.tenantId);
  }

  @Get("ventes-par-jour")
  @ApiOperation({ summary: "Recettes et nombre de tickets agreges par jour, sur N derniers jours" })
  @ApiQuery({ name: "jours", required: false, description: "Profondeur en jours (defaut 7)" })
  ventesParJour(
    @CurrentUser() user: CurrentUserData,
    @Query("jours", new DefaultValuePipe(7), ParseIntPipe) jours: number,
  ) {
    return this.service.ventesParJour(user.tenantId, jours);
  }
}
