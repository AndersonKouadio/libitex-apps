"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@heroui/react";
import { Sparkles, ChevronRight, X, ImagePlus, Phone, MapPin } from "lucide-react";
import { useBoutiqueActiveQuery } from "../queries/boutique-active.query";

const STORAGE_KEY = "libitex_banniere_config_dismissed_v1";

interface ItemConfig {
  cle: string;
  libelle: string;
  description: string;
  href: string;
  icone: typeof ImagePlus;
}

/**
 * Module 14 D2 : bannière dashboard pour completer la config boutique.
 *
 * Critère : il manque le logo, le telephone ou l'adresse (les 3 champs
 * les plus impactants sur la vitrine publique et l'experience client).
 * Si tout est rempli OU si l'utilisateur a dismiss, la bannière reste
 * cachee.
 *
 * Dismiss persisté en localStorage avec version (`_v1`) pour pouvoir
 * la réafficher si on rajoute des champs critiques plus tard.
 */
export function BanniereConfigIncomplete() {
  const { data: boutique } = useBoutiqueActiveQuery();
  const [dismissed, setDismissed] = useState(true); // optimiste : on cache pendant le check

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  const items: ItemConfig[] = useMemo(() => {
    if (!boutique) return [];
    const liste: ItemConfig[] = [];
    if (!boutique.logoUrl) {
      liste.push({
        cle: "logo",
        libelle: "Ajouter un logo",
        description: "Apparait sur votre vitrine et au partage du lien",
        href: "/parametres/profil",
        icone: ImagePlus,
      });
    }
    if (!boutique.telephone) {
      liste.push({
        cle: "tel",
        libelle: "Ajouter un numero WhatsApp",
        description: "Active le bouton « Commander » sur la vitrine",
        href: "/parametres/profil",
        icone: Phone,
      });
    }
    if (!boutique.adresse) {
      liste.push({
        cle: "adresse",
        libelle: "Ajouter une adresse",
        description: "Affichee sur les tickets et la vitrine",
        href: "/parametres/profil",
        icone: MapPin,
      });
    }
    return liste;
  }, [boutique]);

  if (dismissed || items.length === 0) return null;

  function fermer() {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setDismissed(true);
  }

  return (
    <Card className="mb-4 border-accent/30 bg-accent/5">
      <Card.Content className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Completez votre profil boutique
              </p>
              <p className="text-xs text-muted mt-0.5">
                Quelques minutes pour ameliorer votre image et activer toutes les fonctionnalites.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fermer}
            aria-label="Masquer cette bannière"
            className="text-muted hover:text-foreground p-0.5 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <ul className="space-y-1.5">
          {items.map((item) => {
            const Icone = item.icone;
            return (
              <li key={item.cle}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-accent/10 transition-colors"
                >
                  <Icone size={14} className="text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.libelle}</p>
                    <p className="text-xs text-muted truncate">{item.description}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Card.Content>
    </Card>
  );
}
