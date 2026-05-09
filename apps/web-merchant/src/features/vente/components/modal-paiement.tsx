"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@heroui/react";
import {
  Banknote, Smartphone, CreditCard, Landmark, X, type LucideIcon,
} from "lucide-react";
import { MethodePaiement } from "../types/vente.type";
import { formatMontant } from "../utils/format";
import { BoutonPOS } from "./bouton-pos";

export interface PaiementSaisi {
  methode: string;
  montant: number;
}

interface Props {
  total: number;
  enCours: boolean;
  /** Reçoit la liste complete des paiements a appliquer. */
  onPayer: (paiements: PaiementSaisi[]) => void;
  /** Conserve pour API compatibilite — fermeture geree par le Modal.Backdrop */
  onFermer?: () => void;
}

interface MethodeUI {
  code: string;
  libelle: string;
  icone: LucideIcon;
  classes: string;
}

const METHODES: MethodeUI[] = [
  { code: MethodePaiement.CASH, libelle: "Espèces", icone: Banknote, classes: "bg-success/10 text-success" },
  { code: MethodePaiement.MOBILE_MONEY, libelle: "Mobile Money", icone: Smartphone, classes: "bg-warning/10 text-warning" },
  { code: MethodePaiement.CARD, libelle: "Carte", icone: CreditCard, classes: "bg-accent/10 text-accent" },
  { code: MethodePaiement.BANK_TRANSFER, libelle: "Virement", icone: Landmark, classes: "bg-muted/10 text-muted" },
];

const QUICK_RECU = [1000, 2000, 5000, 10000];

/**
 * Modale paiement avec support du paiement multiple (split) :
 * - Le caissier saisit chaque paiement (methode + montant)
 * - Liste des paiements deja ajoutes, possibilite de retirer
 * - "Reste a payer" calcule en temps reel
 * - Bouton intelligent "Ajouter" ou "Ajouter et encaisser" selon le reste apres ajout
 *
 * Pour Especes en dernier paiement : si le montant saisi depasse le reste,
 * la "monnaie a rendre" est affichee. Le surplus est compte comme paye.
 */
export function ModalPaiement({ total, enCours, onPayer }: Props) {
  const [paiements, setPaiements] = useState<PaiementSaisi[]>([]);
  const [methodeCourante, setMethodeCourante] = useState<string>(MethodePaiement.CASH);
  const [montantCourant, setMontantCourant] = useState<number>(total);

  const totalPaye = useMemo(
    () => paiements.reduce((s, p) => s + p.montant, 0),
    [paiements],
  );
  const reste = Math.max(0, total - totalPaye);

  // Synchronise le montant en cours avec le reste a payer (sauf si l'utilisateur l'a edite manuellement)
  useEffect(() => { setMontantCourant(reste); }, [reste]);

  /** Apres ajout : reste = 0 (ou negatif si excedent en especes). */
  const validerApresAjout = montantCourant >= reste && reste > 0;
  const monnaieRendue = methodeCourante === MethodePaiement.CASH && montantCourant > reste
    ? montantCourant - reste
    : 0;

  function ajouterPaiement(): PaiementSaisi[] | null {
    if (montantCourant <= 0) return null;
    // Pour les methodes electroniques, on plafonne au reste pour eviter les
    // surplus impossibles a justifier (le client paie pile par MM/Carte).
    const plafond = methodeCourante === MethodePaiement.CASH ? montantCourant : Math.min(montantCourant, reste);
    if (plafond <= 0) return null;
    const nouveauPaiement: PaiementSaisi = { methode: methodeCourante, montant: plafond };
    const nouvelleListe = [...paiements, nouveauPaiement];
    setPaiements(nouvelleListe);
    return nouvelleListe;
  }

  function ajouterEtEncaisser() {
    const listeFinale = ajouterPaiement();
    if (listeFinale && listeFinale.reduce((s, p) => s + p.montant, 0) >= total) {
      onPayer(listeFinale);
    }
  }

  function ajouterSeulement() {
    ajouterPaiement();
  }

  function retirerPaiement(index: number) {
    setPaiements((prev) => prev.filter((_, i) => i !== index));
  }

  function encaisserListeExistante() {
    if (paiements.length > 0 && totalPaye >= total) onPayer(paiements);
  }

  const methodeChoisie = METHODES.find((m) => m.code === methodeCourante);

  return (
    <div className="space-y-3">
      {/* Recap : Total + Reste + Liste des paiements */}
      <div className="rounded-xl border border-border bg-muted/5 p-3 space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted">Total</span>
          <span className="font-semibold tabular-nums text-foreground">{formatMontant(total)} F</span>
        </div>

        {paiements.length > 0 && (
          <ul className="space-y-1 pl-1 border-l-2 border-accent/20 text-xs">
            {paiements.map((p, i) => {
              const m = METHODES.find((x) => x.code === p.methode);
              return (
                <li key={i} className="flex items-center justify-between gap-2 pl-2">
                  <span className="flex items-center gap-1.5 text-muted">
                    {m && <m.icone size={10} />} {m?.libelle ?? p.methode}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="tabular-nums text-foreground">{formatMontant(p.montant)} F</span>
                    <button
                      type="button"
                      onClick={() => retirerPaiement(i)}
                      className="p-0.5 text-muted hover:text-danger rounded hover:bg-danger/10"
                      aria-label="Retirer ce paiement"
                    >
                      <X size={10} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-baseline justify-between text-sm pt-1 border-t border-border/50">
          <span className={`font-medium ${reste === 0 ? "text-success" : "text-danger"}`}>
            {reste === 0 ? "Tout réglé" : "Reste à payer"}
          </span>
          <span className={`text-lg font-bold tabular-nums ${reste === 0 ? "text-success" : "text-danger"}`}>
            {formatMontant(reste)} F
          </span>
        </div>
      </div>

      {/* Saisie d'un nouveau paiement (cache si tout regle) */}
      {reste > 0 && (
        <>
          <div className="space-y-2">
            <p className="text-[10px] text-muted uppercase tracking-wider">Nouveau paiement</p>

            {/* Methode : 4 boutons compacts en grille */}
            <div className="grid grid-cols-4 gap-1.5">
              {METHODES.map((m) => {
                const actif = methodeCourante === m.code;
                return (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => setMethodeCourante(m.code)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
                      actif
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted hover:border-accent/40 hover:text-foreground"
                    }`}
                  >
                    <m.icone size={16} strokeWidth={actif ? 2.2 : 1.8} />
                    <span className="text-[10px] font-medium leading-none">{m.libelle}</span>
                  </button>
                );
              })}
            </div>

            {/* Montant + quick buttons */}
            <div className="rounded-lg border border-border p-2.5 space-y-2">
              <input
                type="number"
                inputMode="numeric"
                value={montantCourant || ""}
                onChange={(e) => setMontantCourant(Math.max(0, Number(e.target.value) || 0))}
                min={0}
                placeholder="Montant"
                autoFocus
                className="w-full text-2xl font-semibold text-foreground tabular-nums bg-transparent outline-none"
              />
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="ghost"
                  className="h-6 px-1.5 text-[10px] border border-border tabular-nums"
                  onPress={() => setMontantCourant(reste)}
                >
                  Reste
                </Button>
                {QUICK_RECU.map((m) => (
                  <Button
                    key={m}
                    variant="ghost"
                    className="h-6 px-1.5 text-[10px] border border-border tabular-nums"
                    onPress={() => setMontantCourant((c) => c + m)}
                  >
                    + {formatMontant(m)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Monnaie si excedent en especes */}
            {monnaieRendue > 0 && (
              <div className="rounded-lg bg-success/10 text-success p-2 text-center">
                <p className="text-[10px] uppercase tracking-wider opacity-70">Monnaie à rendre</p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatMontant(monnaieRendue)}
                  <span className="text-xs font-normal opacity-60 ml-1">F</span>
                </p>
              </div>
            )}
          </div>

          {/* Bouton intelligent : Ajouter ou Ajouter et encaisser selon le reste apres ajout */}
          <BoutonPOS
            variant="primary"
            className="w-full"
            onPress={validerApresAjout || (montantCourant >= reste && reste > 0)
              ? ajouterEtEncaisser
              : ajouterSeulement}
            isDisabled={enCours || montantCourant <= 0}
          >
            {enCours
              ? "Validation..."
              : montantCourant >= reste
                ? `Encaisser ${formatMontant(total)} F`
                : `+ Ajouter ${methodeChoisie?.libelle ?? ""} ${formatMontant(montantCourant)} F`}
          </BoutonPOS>
        </>
      )}

      {reste === 0 && paiements.length > 0 && (
        <BoutonPOS
          variant="primary"
          className="w-full"
          onPress={encaisserListeExistante}
          isDisabled={enCours}
        >
          {enCours ? "Validation..." : `Encaisser ${formatMontant(total)} F`}
        </BoutonPOS>
      )}
    </div>
  );
}
