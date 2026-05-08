import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { CatalogueService } from "./catalogue.service";
import {
  CreerProduitDto, ModifierProduitDto, CreerCategorieDto, ModifierCategorieDto,
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
  @ApiOperation({ summary: "Créer un produit avec ses variantes" })
  @Roles("ADMIN", "MANAGER")
  creerProduit(@CurrentUser() user: CurrentUserData, @Body() dto: CreerProduitDto) {
    return this.catalogueService.creerProduit(user.tenantId, user.userId, dto);
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
    return this.catalogueService.modifierProduit(user.tenantId, user.userId, id, dto);
  }

  @Delete("produits/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer un produit (soft delete)" })
  @Roles("ADMIN", "MANAGER")
  supprimerProduit(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.catalogueService.supprimerProduit(user.tenantId, user.userId, id);
  }

  // --- Categories ---

  @Post("categories")
  @ApiOperation({ summary: "Créer une catégorie" })
  @Roles("ADMIN", "MANAGER")
  creerCategorie(@CurrentUser() user: CurrentUserData, @Body() dto: CreerCategorieDto) {
    return this.catalogueService.creerCategorie(user.tenantId, dto);
  }

  @Get("categories")
  @ApiOperation({ summary: "Lister les catégories" })
  listerCategories(@CurrentUser() user: CurrentUserData) {
    return this.catalogueService.listerCategories(user.tenantId);
  }

  @Patch("categories/:id")
  @ApiOperation({ summary: "Modifier une catégorie" })
  @Roles("ADMIN", "MANAGER")
  modifierCategorie(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: ModifierCategorieDto,
  ) {
    return this.catalogueService.modifierCategorie(user.tenantId, id, dto);
  }

  @Delete("categories/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer une catégorie (refus si elle contient encore des produits)" })
  @Roles("ADMIN", "MANAGER")
  supprimerCategorie(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.catalogueService.supprimerCategorie(user.tenantId, id);
  }
}
