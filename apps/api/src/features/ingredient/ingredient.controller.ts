import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { IngredientService } from "./ingredient.service";
import {
  CreerIngredientDto, ModifierIngredientDto, EntreeIngredientDto,
  AjustementIngredientDto, DefinirRecetteDto,
} from "./dto/ingredient.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("Ingrédients & Recettes")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("ingredients")
export class IngredientController {
  constructor(private readonly service: IngredientService) {}

  @Get()
  @ApiOperation({ summary: "Lister les ingrédients de la boutique" })
  lister(@CurrentUser() user: CurrentUserData) {
    return this.service.lister(user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: "Créer un nouvel ingrédient" })
  @Roles("ADMIN", "MANAGER")
  creer(@CurrentUser() user: CurrentUserData, @Body() dto: CreerIngredientDto) {
    return this.service.creer(user.tenantId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Modifier un ingrédient" })
  @Roles("ADMIN", "MANAGER")
  modifier(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: ModifierIngredientDto,
  ) {
    return this.service.modifier(user.tenantId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Supprimer un ingrédient (soft delete)" })
  @Roles("ADMIN", "MANAGER")
  supprimer(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.service.supprimer(user.tenantId, id);
  }

  @Post("reception")
  @ApiOperation({ summary: "Réceptionner du stock d'ingrédient" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  receptionner(@CurrentUser() user: CurrentUserData, @Body() dto: EntreeIngredientDto) {
    return this.service.receptionner(user.tenantId, user.userId, dto);
  }

  @Post("ajustement")
  @ApiOperation({ summary: "Ajuster le stock physique d'un ingrédient" })
  @Roles("ADMIN", "MANAGER")
  ajuster(@CurrentUser() user: CurrentUserData, @Body() dto: AjustementIngredientDto) {
    return this.service.ajuster(user.tenantId, user.userId, dto);
  }

  @Get("emplacement/:emplacementId/stock")
  @ApiOperation({ summary: "Stock des ingrédients pour un emplacement" })
  stockParEmplacement(
    @CurrentUser() user: CurrentUserData,
    @Param("emplacementId") emplacementId: string,
  ) {
    return this.service.stockParEmplacement(user.tenantId, emplacementId);
  }

  // --- Recettes ---

  @Get("recettes/:varianteId")
  @ApiOperation({ summary: "Obtenir la recette d'une variante de menu" })
  obtenirRecette(@Param("varianteId") varianteId: string) {
    return this.service.obtenirRecette(varianteId);
  }

  @Post("recettes/:varianteId")
  @ApiOperation({ summary: "Définir la recette d'une variante de menu (remplace la recette existante)" })
  @Roles("ADMIN", "MANAGER")
  definirRecette(
    @CurrentUser() user: CurrentUserData,
    @Param("varianteId") varianteId: string,
    @Body() dto: DefinirRecetteDto,
  ) {
    return this.service.definirRecette(user.tenantId, varianteId, dto);
  }
}
