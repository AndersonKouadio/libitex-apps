"use client";

import { TextField, Label, Input, FieldError, Switch } from "@heroui/react";
import { Pill, Gem, BookOpen } from "lucide-react";
import type { SecteurActivite } from "@/features/auth/types/auth.type";

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

      {secteur === "PHARMACIE" && <ChampsPharmacie metadata={metadata} maj={maj} />}
      {secteur === "BIJOUTERIE" && <ChampsBijouterie metadata={metadata} maj={maj} />}
      {secteur === "LIBRAIRIE" && <ChampsLibrairie metadata={metadata} maj={maj} />}
    </section>
  );
}

function ChampsPharmacie({ metadata, maj }: {
  metadata: Record<string, unknown>;
  maj: (cle: string, valeur: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TextField value={String(metadata.dci ?? "")} onChange={(v) => maj("dci", v)}>
        <Label>DCI (Dénomination commune)</Label>
        <Input placeholder="Paracétamol" />
        <FieldError />
      </TextField>
      <TextField value={String(metadata.dosage ?? "")} onChange={(v) => maj("dosage", v)}>
        <Label>Dosage</Label>
        <Input placeholder="500 mg" />
        <FieldError />
      </TextField>
      <TextField value={String(metadata.formeGalenique ?? "")} onChange={(v) => maj("formeGalenique", v)}>
        <Label>Forme galénique</Label>
        <Input placeholder="Comprimé, sirop, gélule..." />
        <FieldError />
      </TextField>
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Sur ordonnance</p>
          <p className="text-xs text-muted">Délivrance soumise à prescription médicale.</p>
        </div>
        <Switch
          isSelected={Boolean(metadata.surOrdonnance)}
          onChange={(v) => maj("surOrdonnance", v)}
          aria-label="Sur ordonnance"
        />
      </div>
    </div>
  );
}

function ChampsBijouterie({ metadata, maj }: {
  metadata: Record<string, unknown>;
  maj: (cle: string, valeur: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TextField value={String(metadata.matiere ?? "")} onChange={(v) => maj("matiere", v)}>
        <Label>Matière</Label>
        <Input placeholder="Or jaune, argent, plaqué or..." />
        <FieldError />
      </TextField>
      <TextField value={String(metadata.carat ?? "")} onChange={(v) => maj("carat", v)}>
        <Label>Carat / titre</Label>
        <Input placeholder="18K, 925, 750..." />
        <FieldError />
      </TextField>
      <TextField
        value={String(metadata.poidsGrammes ?? "")}
        onChange={(v) => maj("poidsGrammes", v ? Number(v) : undefined)}
      >
        <Label>Poids (grammes)</Label>
        <Input type="number" inputMode="decimal" placeholder="3.50" />
        <FieldError />
      </TextField>
      <TextField value={String(metadata.pierre ?? "")} onChange={(v) => maj("pierre", v)}>
        <Label>Pierre / gemme</Label>
        <Input placeholder="Diamant 0.20ct, sans pierre..." />
        <FieldError />
      </TextField>
    </div>
  );
}

function ChampsLibrairie({ metadata, maj }: {
  metadata: Record<string, unknown>;
  maj: (cle: string, valeur: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TextField value={String(metadata.isbn ?? "")} onChange={(v) => maj("isbn", v)}>
        <Label>ISBN</Label>
        <Input placeholder="978-2-1234-5678-9" />
        <FieldError />
      </TextField>
      <TextField value={String(metadata.auteur ?? "")} onChange={(v) => maj("auteur", v)}>
        <Label>Auteur</Label>
        <Input placeholder="Cheikh Anta Diop" />
        <FieldError />
      </TextField>
      <TextField value={String(metadata.editeur ?? "")} onChange={(v) => maj("editeur", v)}>
        <Label>Éditeur</Label>
        <Input placeholder="Présence Africaine" />
        <FieldError />
      </TextField>
      <TextField value={String(metadata.langue ?? "")} onChange={(v) => maj("langue", v)}>
        <Label>Langue</Label>
        <Input placeholder="Français, anglais, wolof..." />
        <FieldError />
      </TextField>
    </div>
  );
}
