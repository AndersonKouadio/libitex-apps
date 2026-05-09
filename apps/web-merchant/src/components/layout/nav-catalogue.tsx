"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs } from "@heroui/react";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";

interface OngletConfig {
  id: string;
  libelle: string;
  visible?: (secteur: string | undefined) => boolean;
}

const ONGLETS: OngletConfig[] = [
  { id: "/catalogue", libelle: "Produits" },
  { id: "/categories", libelle: "Catégories" },
  {
    id: "/ingredients",
    libelle: "Ingrédients",
    visible: (s) => s === "RESTAURATION" || s === "AUTRE",
  },
  {
    id: "/supplements",
    libelle: "Suppléments",
    visible: (s) => s === "RESTAURATION" || s === "AUTRE",
  },
];

/**
 * Barre d'onglets du domaine Catalogue. A monter en haut des 4 pages
 * (/catalogue, /categories, /ingredients, /supplements). Chaque onglet est un
 * vrai lien Next.js : changer d'onglet navigue vers la route correspondante.
 */
export function NavCatalogue() {
  const pathname = usePathname();
  const { data: boutique } = useBoutiqueActiveQuery();
  const onglets = ONGLETS.filter((o) => !o.visible || o.visible(boutique?.secteurActivite));

  return (
    <Tabs selectedKey={pathname} aria-label="Sections du catalogue" className="mb-5">
      <Tabs.ListContainer>
        <Tabs.List>
          {onglets.map((o) => (
            <Tabs.Tab
              key={o.id}
              id={o.id}
              href={o.id}
              render={(domProps) => <Link {...(domProps as any)} />}
            >
              {o.libelle}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}
