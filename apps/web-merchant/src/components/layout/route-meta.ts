/**
 * Metadonnees de chaque route : titre humain et fil d'ariane.
 *
 * Le breadcrumb est resolu segment par segment a partir du pathname courant.
 * Si une route n'est pas declaree ici, on tombe sur le segment brut capitalise.
 */
export interface RouteMeta {
  titre: string;
  /** Texte plus court pour le fil d'ariane (defaut = titre). */
  raccourci?: string;
}

export const ROUTE_META: Record<string, RouteMeta> = {
  "/dashboard": { titre: "Tableau de bord", raccourci: "Accueil" },
  "/catalogue": { titre: "Catalogue" },
  "/categories": { titre: "Catégories" },
  "/clients": { titre: "Clients" },
  "/ingredients": { titre: "Ingrédients" },
  "/pos": { titre: "Point de vente", raccourci: "Caisse" },
  "/rapports": { titre: "Rapports" },
  "/stock": { titre: "Stock" },
  "/supplements": { titre: "Suppléments" },
  "/parametres": { titre: "Paramètres" },
  "/parametres/boutiques": { titre: "Mes boutiques", raccourci: "Boutiques" },
  "/parametres/profil": { titre: "Profil de la boutique", raccourci: "Profil" },
  "/parametres/equipe": { titre: "Équipe" },
  "/changer-mot-de-passe": { titre: "Changer le mot de passe", raccourci: "Mot de passe" },
};

export interface MailleBreadcrumb {
  href: string;
  libelle: string;
}

/**
 * Construit le fil d'ariane progressif :
 * /parametres/equipe → [Accueil, Paramètres, Équipe]
 */
export function construireBreadcrumb(pathname: string): MailleBreadcrumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const mailles: MailleBreadcrumb[] = [{ href: "/dashboard", libelle: "Accueil" }];

  let courant = "";
  for (const seg of segments) {
    courant += `/${seg}`;
    if (courant === "/dashboard") continue;
    const meta = ROUTE_META[courant];
    mailles.push({
      href: courant,
      libelle: meta?.raccourci ?? meta?.titre ?? capitaliser(seg),
    });
  }
  return mailles;
}

export function obtenirTitre(pathname: string): string {
  return ROUTE_META[pathname]?.titre ?? "";
}

function capitaliser(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
