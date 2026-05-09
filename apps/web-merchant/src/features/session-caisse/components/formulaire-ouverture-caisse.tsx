"use client";

import { useState } from "react";
import {
  Card, Button, TextField, Label, Input, FieldError, TextArea, Switch,
} from "@heroui/react";
import { Lock, Banknote, ChevronDown, ChevronUp } from "lucide-react";
import { useSessionCaisse } from "../hooks/useSessionCaisse";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { FondParMethode } from "../types/session-caisse.type";

interface Props {
  emplacementId: string;
  emplacementNom: string;
}

const VIDE: Partial<FondParMethode> = {
  CASH: 0,
  CARD: 0,
  MOBILE_MONEY: 0,
  BANK_TRANSFER: 0,
};

export function FormulaireOuvertureCaisse({ emplacementId, emplacementNom }: Props) {
  const { token } = useAuth();
  const { enCours, ouvrir } = useSessionCaisse(token);
  const [fond, setFond] = useState<Partial<FondParMethode>>(VIDE);
  const [commentaire, setCommentaire] = useState("");
  const [autresSoldes, setAutresSoldes] = useState(false);

  function maj<K extends keyof FondParMethode>(champ: K, valeur: number) {
    setFond((p) => ({ ...p, [champ]: valeur }));
  }

  async function soumettre() {
    await ouvrir({ emplacementId, fondInitial: fond, commentaire });
    // Pas besoin de reset : la query session-active va re-fetch et le composant
    // parent va switch vers l'ecran POS normal.
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <span className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            <Lock size={18} strokeWidth={2} />
          </span>
          <div>
            <Card.Title>Ouvrir la caisse</Card.Title>
            <Card.Description>
              {emplacementNom} — declarez le fond initial pour commencer a vendre
            </Card.Description>
          </div>
        </Card.Header>

        <Card.Content className="space-y-4">
          <TextField
            isRequired
            type="number"
            value={String(fond.CASH ?? "")}
            onChange={(v) => maj("CASH", Number(v) || 0)}
          >
            <Label className="flex items-center gap-1.5">
              <Banknote size={14} className="text-success" />
              Fond initial — espèces (F CFA)
            </Label>
            <Input placeholder="50 000" min="0" autoFocus />
            <FieldError />
          </TextField>

          <button
            type="button"
            onClick={() => setAutresSoldes((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
          >
            {autresSoldes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Declarer d'autres soldes initiaux (optionnel)
          </button>

          {autresSoldes && (
            <div className="grid grid-cols-2 gap-3 pl-1">
              <TextField
                type="number"
                value={String(fond.MOBILE_MONEY ?? "")}
                onChange={(v) => maj("MOBILE_MONEY", Number(v) || 0)}
              >
                <Label className="text-xs">Mobile Money</Label>
                <Input placeholder="0" min="0" />
                <FieldError />
              </TextField>
              <TextField
                type="number"
                value={String(fond.CARD ?? "")}
                onChange={(v) => maj("CARD", Number(v) || 0)}
              >
                <Label className="text-xs">Carte</Label>
                <Input placeholder="0" min="0" />
                <FieldError />
              </TextField>
              <TextField
                type="number"
                value={String(fond.BANK_TRANSFER ?? "")}
                onChange={(v) => maj("BANK_TRANSFER", Number(v) || 0)}
                className="col-span-2"
              >
                <Label className="text-xs">Virement</Label>
                <Input placeholder="0" min="0" />
                <FieldError />
              </TextField>
            </div>
          )}

          <TextField value={commentaire} onChange={setCommentaire}>
            <Label>Commentaire (optionnel)</Label>
            <TextArea placeholder="Caisse principale, ouverture matin" rows={2} />
            <FieldError />
          </TextField>
        </Card.Content>

        <Card.Footer>
          <Button
            variant="primary"
            className="w-full h-11"
            onPress={soumettre}
            isDisabled={enCours}
          >
            {enCours ? "Ouverture..." : "Ouvrir la caisse"}
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
