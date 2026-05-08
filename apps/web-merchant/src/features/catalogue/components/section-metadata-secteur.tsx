"use client";

import {
  TextField, Label, Input, FieldError, Switch,
  Select, ListBox,
} from "@heroui/react";
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

const FORMES_GALENIQUES = [
  "Comprimé", "Comprimé effervescent", "Gélule", "Capsule", "Sirop",
  "Solution buvable", "Suspension", "Pommade", "Crème", "Gel",
  "Suppositoire", "Injection", "Collyre", "Aérosol", "Autre",
] as const;

const MATIERES_BIJOU = [
  "Or jaune", "Or blanc", "Or rose", "Argent", "Plaqué or",
  "Plaqué argent", "Acier inoxydable", "Acier chirurgical",
  "Cuivre", "Laiton", "Autre",
] as const;

const CARATS = [
  "24K (999)", "22K (916)", "21K (875)", "18K (750)", "14K (583)", "9K (375)",
  "925 (Argent)", "950 (Argent)", "Plaqué", "Non précisé",
] as const;

const PIERRES = [
  "Sans pierre", "Diamant", "Saphir", "Rubis", "Émeraude",
  "Topaze", "Améthyste", "Perle", "Zircon", "Autre",
] as const;

const LANGUES = [
  "Français", "Anglais", "Arabe", "Wolof", "Bambara",
  "Lingala", "Espagnol", "Allemand", "Autre",
] as const;

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

interface ChampsProps {
  metadata: Record<string, unknown>;
  maj: (cle: string, valeur: unknown) => void;
}

function SelectChamp({
  label, valeur, options, onChange,
}: {
  label: string;
  valeur: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <Select
      selectedKey={valeur || null}
      onSelectionChange={(k) => onChange(k ? String(k) : "")}
      aria-label={label}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((opt) => (
            <ListBox.Item key={opt} id={opt} textValue={opt}>
              {opt}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function ChampsPharmacie({ metadata, maj }: ChampsProps) {
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
      <SelectChamp
        label="Forme galénique"
        valeur={String(metadata.formeGalenique ?? "")}
        options={FORMES_GALENIQUES}
        onChange={(v) => maj("formeGalenique", v)}
      />
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

function ChampsBijouterie({ metadata, maj }: ChampsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <SelectChamp
        label="Matière"
        valeur={String(metadata.matiere ?? "")}
        options={MATIERES_BIJOU}
        onChange={(v) => maj("matiere", v)}
      />
      <SelectChamp
        label="Carat / titre"
        valeur={String(metadata.carat ?? "")}
        options={CARATS}
        onChange={(v) => maj("carat", v)}
      />
      <TextField
        value={String(metadata.poidsGrammes ?? "")}
        onChange={(v) => maj("poidsGrammes", v ? Number(v) : undefined)}
      >
        <Label>Poids (grammes)</Label>
        <Input type="number" inputMode="decimal" placeholder="3.50" />
        <FieldError />
      </TextField>
      <SelectChamp
        label="Pierre / gemme"
        valeur={String(metadata.pierre ?? "")}
        options={PIERRES}
        onChange={(v) => maj("pierre", v)}
      />
    </div>
  );
}

function ChampsLibrairie({ metadata, maj }: ChampsProps) {
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
      <SelectChamp
        label="Langue"
        valeur={String(metadata.langue ?? "")}
        options={LANGUES}
        onChange={(v) => maj("langue", v)}
      />
    </div>
  );
}
