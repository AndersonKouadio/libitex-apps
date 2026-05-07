import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { CatalogueService } from "./catalogue.service";
import {
  CreerProduitDto, ModifierProduitDto, CreerCategorieDto,
} from "./dto/produit.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("Catalogue")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("catalogue")
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  // --- Produits ---

  @Post("produits")
  @ApiOperation({ summary: "Creer un produit avec ses variantes" })
  @Roles("ADMIN", "MANAGER")
  creerProduit(@CurrentUser() user: CurrentUserData, @Body() dto: CreerProduitDto) {
    return this.catalogueService.creerProduit(user.tenantId, dto);
  }

  @Get("produits")
  @ApiOperation({ summary: "Lister les produits (pagine, recherche)" })
  listerProduits(
    @CurrentUser() user: CurrentUserData,
    @Query() pagination: PaginationDto,
    @Query("recherche") recherche?: string,
  ) {
    return this.catalogueService.listerProduits(
      user.tenantId, pagination.page, pagination.limit, recherche,
    );
  }

  @Get("produits/:id")
  @ApiOperation({ summary: "Obtenir un produit par son identifiant" })
  obtenirProduit(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.catalogueService.obtenirProduit(user.tenantId, id);
  }

  @Patch("produits/:id")
  @ApiOperation({ summary: "Modifier un produit" })
  @Roles("ADMIN", "MANAGER")
  modifierProduit(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: ModifierProduitDto,
  ) {
    return this.catalogueService.modifierProduit(user.tenantId, id, dto);
  }

  @Delete("produits/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer un produit (soft delete)" })
  @Roles("ADMIN", "MANAGER")
  supprimerProduit(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.catalogueService.supprimerProduit(user.tenantId, id);
  }

  // --- Categories ---

  @Post("categories")
  @ApiOperation({ summary: "Creer une categorie" })
  @Roles("ADMIN", "MANAGER")
  creerCategorie(@CurrentUser() user: CurrentUserData, @Body() dto: CreerCategorieDto) {
    return this.catalogueService.creerCategorie(user.tenantId, dto);
  }

  @Get("categories")
  @ApiOperation({ summary: "Lister les categories" })
  listerCategories(@CurrentUser() user: CurrentUserData) {
    return this.catalogueService.listerCategories(user.tenantId);
  }
}
