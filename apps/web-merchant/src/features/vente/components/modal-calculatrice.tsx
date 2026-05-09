"use client";

import { useState, useCallback, useEffect } from "react";
import { Modal, Button } from "@heroui/react";
import { Calculator, Delete } from "lucide-react";
import { formatMontant } from "../utils/format";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

type Operation = "+" | "-" | "*" | "/" | null;

/**
 * Calculatrice independante pour le POS. Utilisations courantes :
 * verification d'addition rapide, calcul a part, conversion mentale.
 *
 * Pas d'integration avec le panier ou la modale paiement (intentionnel) :
 * c'est un outil "a cote" comme une calculette physique posee sur le comptoir.
 * Le calcul de monnaie est gere directement dans la modale paiement.
 */
export function ModalCalculatrice({ ouvert, onFermer }: Props) {
  const [valeurAffichee, setValeurAffichee] = useState("0");
  const [valeurStockee, setValeurStockee] = useState<number | null>(null);
  const [operation, setOperation] = useState<Operation>(null);
  /** Vrai apres pression d'une operation : la prochaine touche commence un nouveau nombre. */
  const [resetSurProchaineTouche, setResetSurProchaineTouche] = useState(false);

  const reset = useCallback(() => {
    setValeurAffichee("0");
    setValeurStockee(null);
    setOperation(null);
    setResetSurProchaineTouche(false);
  }, []);

  // Reset a l'ouverture pour eviter d'afficher l'etat precedent
  useEffect(() => { if (ouvert) reset(); }, [ouvert, reset]);

  const ajouterChiffre = useCallback((chiffre: string) => {
    if (resetSurProchaineTouche) {
      setValeurAffichee(chiffre);
      setResetSurProchaineTouche(false);
      return;
    }
    setValeurAffichee((prev) => (prev === "0" ? chiffre : prev + chiffre));
  }, [resetSurProchaineTouche]);

  const ajouterDecimale = useCallback(() => {
    if (resetSurProchaineTouche) {
      setValeurAffichee("0.");
      setResetSurProchaineTouche(false);
      return;
    }
    setValeurAffichee((prev) => (prev.includes(".") ? prev : prev + "."));
  }, [resetSurProchaineTouche]);

  const calculer = useCallback((a: number, b: number, op: Operation): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? 0 : a / b;
      default: return b;
    }
  }, []);

  const appliquerOperation = useCallback((op: Operation) => {
    const valeurCourante = parseFloat(valeurAffichee);
    if (valeurStockee === null || operation === null) {
      setValeurStockee(valeurCourante);
    } else {
      const resultat = calculer(valeurStockee, valeurCourante, operation);
      setValeurStockee(resultat);
      setValeurAffichee(String(resultat));
    }
    setOperation(op);
    setResetSurProchaineTouche(true);
  }, [valeurAffichee, valeurStockee, operation, calculer]);

  const egal = useCallback(() => {
    if (valeurStockee === null || operation === null) return;
    const valeurCourante = parseFloat(valeurAffichee);
    const resultat = calculer(valeurStockee, valeurCourante, operation);
    setValeurAffichee(String(resultat));
    setValeurStockee(null);
    setOperation(null);
    setResetSurProchaineTouche(true);
  }, [valeurAffichee, valeurStockee, operation, calculer]);

  const effacer = useCallback(() => {
    setValeurAffichee((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
  }, []);

  const valeurNumerique = parseFloat(valeurAffichee) || 0;
  const affichage = valeurAffichee.includes(".")
    ? valeurAffichee
    : formatMontant(valeurNumerique);

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="sm" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <Calculator className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Calculatrice</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-3">
            {/* Ecran */}
            <div className="rounded-xl bg-navy text-navy-foreground p-4 text-right">
              {operation && valeurStockee !== null && (
                <p className="text-xs text-navy-foreground/55 tabular-nums">
                  {formatMontant(valeurStockee)} {symboleOperation(operation)}
                </p>
              )}
              <p className="text-3xl font-bold tabular-nums tracking-tight break-all">
                {affichage}
              </p>
            </div>

            {/* Clavier */}
            <div className="grid grid-cols-4 gap-2">
              <BoutonCalc onPress={reset} variant="danger-soft" colSpan={2}>C</BoutonCalc>
              <BoutonCalc onPress={effacer} variant="ghost-bordered">
                <Delete size={16} />
              </BoutonCalc>
              <BoutonCalc onPress={() => appliquerOperation("/")} variant="accent" actif={operation === "/"}>÷</BoutonCalc>

              <BoutonCalc onPress={() => ajouterChiffre("7")}>7</BoutonCalc>
              <BoutonCalc onPress={() => ajouterChiffre("8")}>8</BoutonCalc>
              <BoutonCalc onPress={() => ajouterChiffre("9")}>9</BoutonCalc>
              <BoutonCalc onPress={() => appliquerOperation("*")} variant="accent" actif={operation === "*"}>×</BoutonCalc>

              <BoutonCalc onPress={() => ajouterChiffre("4")}>4</BoutonCalc>
              <BoutonCalc onPress={() => ajouterChiffre("5")}>5</BoutonCalc>
              <BoutonCalc onPress={() => ajouterChiffre("6")}>6</BoutonCalc>
              <BoutonCalc onPress={() => appliquerOperation("-")} variant="accent" actif={operation === "-"}>−</BoutonCalc>

              <BoutonCalc onPress={() => ajouterChiffre("1")}>1</BoutonCalc>
              <BoutonCalc onPress={() => ajouterChiffre("2")}>2</BoutonCalc>
              <BoutonCalc onPress={() => ajouterChiffre("3")}>3</BoutonCalc>
              <BoutonCalc onPress={() => appliquerOperation("+")} variant="accent" actif={operation === "+"}>+</BoutonCalc>

              <BoutonCalc onPress={() => ajouterChiffre("0")} colSpan={2}>0</BoutonCalc>
              <BoutonCalc onPress={ajouterDecimale}>,</BoutonCalc>
              <BoutonCalc onPress={egal} variant="primary">=</BoutonCalc>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="primary" slot="close">Fermer</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function symboleOperation(op: Exclude<Operation, null>): string {
  return { "+": "+", "-": "−", "*": "×", "/": "÷" }[op];
}

function BoutonCalc({
  children, onPress, variant = "ghost-bordered", actif, colSpan,
}: {
  children: React.ReactNode;
  onPress: () => void;
  variant?: "ghost-bordered" | "accent" | "primary" | "danger-soft";
  actif?: boolean;
  colSpan?: 1 | 2;
}) {
  const base = "h-12 text-base font-semibold rounded-md transition-colors";
  const styles = {
    "ghost-bordered": "bg-surface-secondary text-foreground hover:bg-foreground/5 border border-border",
    "accent": actif
      ? "bg-accent text-accent-foreground"
      : "bg-accent/10 text-accent hover:bg-accent/15 border border-accent/30",
    "primary": "bg-accent text-accent-foreground hover:bg-accent/90",
    "danger-soft": "bg-danger/10 text-danger hover:bg-danger/15 border border-danger/30",
  };
  const span = colSpan === 2 ? "col-span-2" : "";
  return (
    <button
      type="button"
      onClick={onPress}
      className={`${base} ${styles[variant]} ${span}`}
    >
      {children}
    </button>
  );
}
