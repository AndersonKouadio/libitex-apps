"use client";

import { useState, type FormEvent } from "react";
import { Tag, X, Loader2 } from "lucide-react";
import { toast, TextField, Input, Button } from "@heroui/react";
import { promotionAPI } from "../apis/promotion.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatMontant } from "@/features/vente/utils/format";

interface Props {
  sousTotal: number;
  /** Client lie au panier (pour check perCustomerLimit). */
  clientId?: string;
  /** Remise globale courante. Si elle commence par "PROMO:", c'est notre code. */
  remiseCourante: { montant: number; raison?: string } | null;
  /** Applique une remise calculee a partir d'un code promo valide. */
  onAppliquer: (montant: number, code: string) => void;
  /** Retire la remise courante (clic sur X). */
  onRetirer: () => void;
}

const PREFIX = "PROMO:";

/**
 * Champ "Code promo" pour le panier POS. Soit affiche un input pour saisir
 * le code, soit affiche le code applique avec un bouton X pour le retirer.
 * Stocke la raison "PROMO:CODE" dans la remise globale du panier — le
 * backend recoit ca et reconnait le pattern pour incrementer le compteur
 * d'usage au moment de la cloture du ticket.
 */
export function BarreCodePromo({
  sousTotal, clientId, remiseCourante, onAppliquer, onRetirer,
}: Props) {
  const { token } = useAuth();
  const [code, setCode] = useState("");
  const [validation, setValidation] = useState(false);

  const codeApplique = remiseCourante?.raison?.startsWith(PREFIX)
    ? remiseCourante.raison.slice(PREFIX.length)
    : null;

  async function valider(e: FormEvent) {
    e.preventDefault();
    if (!token || !code.trim()) return;
    setValidation(true);
    try {
      const r = await promotionAPI.valider(token, code.trim(), sousTotal, clientId);
      if (!r.valide) {
        toast.danger(r.raison ?? "Code invalide");
        return;
      }
      if (r.remise <= 0) {
        toast.warning("Aucune remise applicable");
        return;
      }
      onAppliquer(r.remise, code.trim().toUpperCase());
      setCode("");
      toast.success(`Remise ${formatMontant(r.remise)} F appliquee`);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Erreur de validation");
    } finally {
      setValidation(false);
    }
  }

  if (codeApplique) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/30">
        <div className="flex items-center gap-2 min-w-0">
          <Tag size={14} className="text-accent shrink-0" />
          <span className="text-sm font-mono font-bold text-accent truncate">
            {codeApplique}
          </span>
          <span className="text-xs text-muted shrink-0">
            -{formatMontant(remiseCourante!.montant)} F
          </span>
        </div>
        <button
          type="button"
          onClick={onRetirer}
          aria-label="Retirer le code promo"
          className="p-1 text-muted hover:text-danger rounded hover:bg-danger/10"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={valider} className="flex items-center gap-1.5">
      <div className="relative flex-1">
        <Tag
          size={12}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none z-10"
        />
        <TextField value={code} onChange={setCode} aria-label="Saisir un code promo">
          <Input
            placeholder="Code promo"
            autoCapitalize="characters"
            className="h-8 pl-7 pr-2 text-xs uppercase"
          />
        </TextField>
      </div>
      <Button
        type="submit"
        variant="primary"
        className="h-8 px-2.5 text-xs min-w-0"
        isDisabled={validation || !code.trim() || !!remiseCourante}
        aria-label={
          remiseCourante && !codeApplique
            ? "Une remise manuelle est deja appliquee"
            : "Appliquer le code"
        }
      >
        {validation ? <Loader2 size={12} className="animate-spin" /> : "OK"}
      </Button>
    </form>
  );
}
