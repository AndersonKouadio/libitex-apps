"use client";

import { Pill, Gem, BookOpen } from "lucide-react";
import type { SecteurActivite } from "@/features/auth/types/auth.type";
import { ChampsSecteurPharmacie } from "./champs-secteur-pharmacie";
import { ChampsSecteurBijouterie } from "./champs-secteur-bijouterie";
import { ChampsSecteurLibrairie } from "./champs-secteur-librairie";

interface Props {
  secteur: SecteurActivite | undefined;
  metadata: Record<string, unknown>;
  onChange: (metadata: Record<string, unknown>) => void;
}

interface ConfigSection {
  titre: string;
  hint: string;
  icone: typeof Pill;
  classes: string;
}

const CONFIGS: Partial<Record<SecteurActivite, ConfigSection>> = {
  PHARMACIE: {
    titre: "Spécificités pharmacie",
    hint: "DCI, dosage et forme galénique facilitent la recherche et l'audit réglementaire.",
    icone: Pill,
    classes: "bg-success/10 text-success",
  },
  BIJOUTERIE: {
    titre: "Spécificités bijouterie",
    hint: "Matière, carat et poids sont indispensables pour la traçabilité et l'évaluation.",
    icone: Gem,
    classes: "bg-warning/10 text-warning",
  },
  LIBRAIRIE: {
    titre: "Spécificités librairie",
    hint: "ISBN et auteur permettent un référencement plus précis.",
    icone: BookOpen,
    classes: "bg-accent/10 text-accent",
  },
};

export function SectionMetadataSecteur({ secteur, metadata, onChange }: Props) {
  const config = secteur ? CONFIGS[secteur] : undefined;
  if (!config) return null;

  function maj(cle: string, valeur: unknown) {
    onChange({ ...metadata, [cle]: valeur });
  }

  const Icone = config.icone;

  return (
    <section className="space-y-4">
      <header className="flex items-start gap-3 pb-2 border-b border-border">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.classes}`}>
          <Icone size={16} strokeWidth={2} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{config.titre}</h3>
          <p className="text-xs text-muted mt-0.5">{config.hint}</p>
        </div>
      </header>

      {secteur === "PHARMACIE" && <ChampsSecteurPharmacie metadata={metadata} maj={maj} />}
      {secteur === "BIJOUTERIE" && <ChampsSecteurBijouterie metadata={metadata} maj={maj} />}
      {secteur === "LIBRAIRIE" && <ChampsSecteurLibrairie metadata={metadata} maj={maj} />}
    </section>
  );
}
