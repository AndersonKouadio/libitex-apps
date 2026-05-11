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
  @ApiOperation({ summary: "Indicateurs cles de la journée (recettes, tickets, ticket moyen, catalogue, emplacements)" })
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

  @Get("top-produits")
  @ApiOperation({ summary: "Top N produits par chiffre d'affaires sur la période" })
  @ApiQuery({ name: "jours", required: false })
  @ApiQuery({ name: "limit", required: false })
  topProduits(
    @CurrentUser() user: CurrentUserData,
    @Query("jours", new DefaultValuePipe(7), ParseIntPipe) jours: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.service.topProduits(user.tenantId, jours, limit);
  }

  @Get("repartition-paiements")
  @ApiOperation({ summary: "Repartition du CA par methode de paiement sur la période" })
  @ApiQuery({ name: "jours", required: false })
  repartitionPaiements(
    @CurrentUser() user: CurrentUserData,
    @Query("jours", new DefaultValuePipe(7), ParseIntPipe) jours: number,
  ) {
    return this.service.repartitionPaiements(user.tenantId, jours);
  }

  @Get("kpis-periode")
  @ApiOperation({ summary: "KPIs sur N jours avec tendance vs période précédente" })
  @ApiQuery({ name: "jours", required: false })
  kpisPeriode(
    @CurrentUser() user: CurrentUserData,
    @Query("jours", new DefaultValuePipe(7), ParseIntPipe) jours: number,
  ) {
    return this.service.kpisPeriode(user.tenantId, jours);
  }
}
