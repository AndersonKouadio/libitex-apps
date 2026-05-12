import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ShowcaseService } from "./showcase.service";

/**
 * Endpoints PUBLICS pour le showcase e-commerce. Pas de JWT, pas de garde :
 * tout ce qui est exposé ici est visible par n'importe quel internaute qui
 * connait le slug de la boutique.
 *
 * Filtres backend : produits actifs + non supprimes + non supplements.
 * Donc un commercant peut "cacher" un produit du showcase en le desactivant
 * dans le catalogue.
 */
@ApiTags("Showcase (public)")
@Controller("public/boutiques")
export class ShowcaseController {
  constructor(private readonly service: ShowcaseService) {}

  @Get(":slug")
  @ApiOperation({ summary: "Obtenir les infos publiques d'une boutique" })
  obtenirBoutique(@Param("slug") slug: string) {
    return this.service.obtenirBoutique(slug);
  }

  @Get(":slug/produits")
  @ApiOperation({ summary: "Lister les produits publics" })
  listerProduits(
    @Param("slug") slug: string,
    @Query("categorieId") categorieId?: string,
  ) {
    return this.service.listerProduits(slug, categorieId);
  }

  @Get(":slug/produits/:id")
  @ApiOperation({ summary: "Detail d'un produit public" })
  obtenirProduit(@Param("slug") slug: string, @Param("id") id: string) {
    return this.service.obtenirProduit(slug, id);
  }

  @Get(":slug/categories")
  @ApiOperation({ summary: "Lister les categories publiques" })
  listerCategories(@Param("slug") slug: string) {
    return this.service.listerCategories(slug);
  }
}
