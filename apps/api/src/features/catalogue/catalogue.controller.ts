import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { CatalogueService } from "./catalogue.service";
import {
  CreerProduitDto, ModifierProduitDto, ModifierVarianteDto,
  CreerCategorieDto, ModifierCategorieDto,
  ListerProduitsQueryDto, ImporterProduitsDto,
} from "./dto/produit.dto";
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
  @ApiOperation({ summary: "Lister les produits (pagine, recherche, filtres)" })
  listerProduits(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ListerProduitsQueryDto,
  ) {
    const isSupp =
      query.isSupplement === "true" ? true :
      query.isSupplement === "false" ? false :
      undefined;
    const actif =
      query.actif === "true" ? true :
      query.actif === "false" ? false :
      undefined;
    return this.catalogueService.listerProduits(user.tenantId, {
      page: query.page,
      limit: query.limit,
      recherche: query.recherche,
      isSupplement: isSupp,
      typeProduit: query.typeProduit,
      categorieId: query.categorieId,
      actif,
    });
  }

  @Get("produits/par-code/:code")
  @ApiOperation({ summary: "Rechercher un produit par code-barres ou SKU d'une variante (scan POS)" })
  trouverProduitParCodeBarres(
    @CurrentUser() user: CurrentUserData,
    @Param("code") code: string,
  ) {
    return this.catalogueService.trouverProduitParCodeBarres(user.tenantId, code);
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

  @Post("produits/import")
  @ApiOperation({
    summary: "Importer plusieurs produits en lot (CSV).",
    description: "Cree N produits en sequence. Les erreurs sont accumulees ligne par ligne et n'interrompent pas le traitement.",
  })
  @Roles("ADMIN", "MANAGER")
  importerProduits(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ImporterProduitsDto,
  ) {
    return this.catalogueService.importerProduits(user.tenantId, user.userId, dto);
  }

  @Patch("produits/:produitId/variantes/:varianteId")
  @ApiOperation({ summary: "Modifier une variante (sku, prix, code-barres, actif)" })
  @Roles("ADMIN", "MANAGER")
  modifierVariante(
    @CurrentUser() user: CurrentUserData,
    @Param("produitId") produitId: string,
    @Param("varianteId") varianteId: string,
    @Body() dto: ModifierVarianteDto,
  ) {
    return this.catalogueService.modifierVariante(
      user.tenantId, user.userId, produitId, varianteId, dto,
    );
  }

  @Get("disponibilites")
  @ApiOperation({
    summary: "Map des variantes indisponibles pour un emplacement (rupture, ingredient manquant) + nb portions servables pour les MENU",
  })
  disponibilites(
    @CurrentUser() user: CurrentUserData,
    @Query("emplacementId") emplacementId: string,
  ) {
    return this.catalogueService.disponibilitesEmplacement(user.tenantId, emplacementId);
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
