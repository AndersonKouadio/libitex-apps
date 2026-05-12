import { Controller, Get, Param, Query, Header, DefaultValuePipe, ParseIntPipe } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ShowcaseService } from "./showcase.service";

/**
 * Endpoints PUBLICS pour le showcase e-commerce. Pas de JWT, pas de garde :
 * tout ce qui est exposé ici est visible par n'importe quel internaute qui
 * connait le slug de la boutique.
 *
 * Filtres backend : produits actifs + non supprimes + non supplements.
 * Donc un commercant peut "cacher" un produit du showcase en le desactivant
 * dans le catalogue.
 *
 * Fix C1 : @Throttle short (30 req / 10s par IP) — protege contre les
 * scrapers/crawlers agressifs sans bloquer les visiteurs legitimes.
 *
 * Fix C3 : @Header Cache-Control public pour les CDN/proxies. max-age=60
 * cote browser, s-maxage=120 cote CDN, stale-while-revalidate=300 pour
 * servir un cache potentiellement perime pendant qu'on rafraichit.
 */
@ApiTags("Showcase (public)")
@Controller("public/boutiques")
@Throttle({ short: { ttl: 10000, limit: 30 } })
export class ShowcaseController {
  constructor(private readonly service: ShowcaseService) {}

  @Get(":slug")
  @Header("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300")
  @ApiOperation({ summary: "Obtenir les infos publiques d'une boutique" })
  obtenirBoutique(@Param("slug") slug: string) {
    return this.service.obtenirBoutique(slug);
  }

  @Get(":slug/produits")
  @Header("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300")
  @ApiOperation({ summary: "Lister les produits publics (pagine, recherche, filtre categorie)" })
  @ApiQuery({ name: "categorieId", required: false })
  @ApiQuery({ name: "recherche", required: false, description: "Min 2 caracteres" })
  @ApiQuery({ name: "limit", required: false, description: "Taille de page (1-100, defaut 24)" })
  @ApiQuery({ name: "offset", required: false, description: "Offset pagination (defaut 0)" })
  listerProduits(
    @Param("slug") slug: string,
    @Query("categorieId") categorieId?: string,
    @Query("recherche") recherche?: string,
    @Query("limit", new DefaultValuePipe(24), ParseIntPipe) limit?: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.service.listerProduits(slug, { categorieId, recherche, limit, offset });
  }

  @Get(":slug/produits/:id")
  @Header("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300")
  @ApiOperation({ summary: "Detail d'un produit public" })
  obtenirProduit(@Param("slug") slug: string, @Param("id") id: string) {
    return this.service.obtenirProduit(slug, id);
  }

  @Get(":slug/categories")
  @Header("Cache-Control", "public, max-age=300, s-maxage=600, stale-while-revalidate=1800")
  @ApiOperation({ summary: "Lister les categories publiques" })
  listerCategories(@Param("slug") slug: string) {
    return this.service.listerCategories(slug);
  }
}
