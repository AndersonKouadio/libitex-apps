"use client";

import { useState } from "react";
import { TextField, Label, Input, Button, Chip } from "@heroui/react";
import { Trash2, X } from "lucide-react";
import type { AxeAttribut } from "../utils/generer-variantes";

interface Props {
  index: number;
  axe: AxeAttribut;
  onChange: (index: number, data: Partial<AxeAttribut>) => void;
  onRetirer: (index: number) => void;
  peutRetirer: boolean;
}

export function LigneAxeAttribut({ index, axe, onChange, onRetirer, peutRetirer }: Props) {
  const [valeurEnCours, setValeurEnCours] = useState("");

  function ajouterValeur() {
    const valeur = valeurEnCours.trim();
    if (!valeur || axe.valeurs.includes(valeur)) return;
    onChange(index, { valeurs: [...axe.valeurs, valeur] });
    setValeurEnCours("");
  }

  function retirerValeur(valeur: string) {
    onChange(index, { valeurs: axe.valeurs.filter((v) => v !== valeur) });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3 space-y-3">
      <div className="flex items-start gap-3">
        <TextField
          name={`axe-${index}`}
          value={axe.nom}
          onChange={(v) => onChange(index, { nom: v })}
          className="flex-1"
        >
          <Label>Nom de l'attribut</Label>
          <Input placeholder="Couleur, Taille, Matiere..." />
        </TextField>
        {peutRetirer && (
          <Button
            variant="ghost"
            className="mt-7 p-1.5 h-auto min-w-0 text-muted hover:text-danger hover:bg-danger/10"
            onPress={() => onRetirer(index)}
            aria-label="Retirer cet attribut"
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted mb-1.5">Valeurs ({axe.valeurs.length})</p>
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {axe.valeurs.map((v) => (
            <Chip key={v} className="bg-accent/10 text-accent gap-1">
              {v}
              <Button
                variant="ghost"
                className="p-0 h-auto min-w-0 -mr-0.5 text-accent/70 hover:text-accent hover:bg-transparent"
                onPress={() => retirerValeur(v)}
                aria-label={`Retirer ${v}`}
              >
                <X size={12} />
              </Button>
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={valeurEnCours}
            onChange={(e) => setValeurEnCours(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouterValeur(); } }}
            placeholder="Bleu, M, Cuir... puis Entrer"
            className="flex-1"
          />
          <Button variant="secondary" onPress={ajouterValeur} isDisabled={!valeurEnCours.trim()}>
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
}
