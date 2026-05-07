import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { StockService } from "./stock.service";
import {
  CreerEmplacementDto, EntreeStockDto, AjustementStockDto, TransfertStockDto,
} from "./dto/stock.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("Stock")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("stock")
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post("emplacements")
  @ApiOperation({ summary: "Creer un emplacement (entrepot, boutique)" })
  @Roles("ADMIN", "MANAGER")
  creerEmplacement(@CurrentUser() user: CurrentUserData, @Body() dto: CreerEmplacementDto) {
    return this.stockService.creerEmplacement(user.tenantId, dto);
  }

  @Get("emplacements")
  @ApiOperation({ summary: "Lister les emplacements" })
  listerEmplacements(@CurrentUser() user: CurrentUserData) {
    return this.stockService.listerEmplacements(user.tenantId);
  }

  @Post("entree")
  @ApiOperation({ summary: "Entree de stock — reception de marchandise" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  entreeStock(@CurrentUser() user: CurrentUserData, @Body() dto: EntreeStockDto) {
    return this.stockService.entreeStock(user.tenantId, user.userId, dto);
  }

  @Post("ajustement")
  @ApiOperation({ summary: "Ajustement de stock (correction inventaire)" })
  @Roles("ADMIN", "MANAGER")
  ajuster(@CurrentUser() user: CurrentUserData, @Body() dto: AjustementStockDto) {
    return this.stockService.ajuster(user.tenantId, user.userId, dto);
  }

  @Post("transfert")
  @ApiOperation({ summary: "Transfert de stock entre emplacements" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  transferer(@CurrentUser() user: CurrentUserData, @Body() dto: TransfertStockDto) {
    return this.stockService.transferer(user.tenantId, user.userId, dto);
  }

  @Get("actuel/:varianteId/:emplacementId")
  @ApiOperation({ summary: "Stock actuel d'une variante dans un emplacement" })
  obtenirStockActuel(
    @CurrentUser() user: CurrentUserData,
    @Param("varianteId") varianteId: string,
    @Param("emplacementId") emplacementId: string,
  ) {
    return this.stockService.obtenirStockActuel(user.tenantId, varianteId, emplacementId);
  }

  @Get("emplacement/:emplacementId")
  @ApiOperation({ summary: "Stock complet d'un emplacement" })
  stockParEmplacement(
    @CurrentUser() user: CurrentUserData,
    @Param("emplacementId") emplacementId: string,
  ) {
    return this.stockService.obtenirStockParEmplacement(user.tenantId, emplacementId);
  }
}
