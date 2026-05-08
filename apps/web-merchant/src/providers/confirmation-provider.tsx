"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertDialog, Button } from "@heroui/react";

export type StatutConfirmation = "danger" | "accent" | "success" | "warning";

export interface OptionsConfirmation {
  titre: string;
  description: React.ReactNode;
  /** Libelle du bouton d'action principale. Defaut : "Confirmer". */
  actionLibelle?: string;
  /** Libelle du bouton d'annulation. Defaut : "Annuler". */
  annulerLibelle?: string;
  /** Couleur de l'icone et variante du bouton principal. Defaut : "danger". */
  statut?: StatutConfirmation;
}

type Resolveur = (resultat: boolean) => void;

interface ContexteConfirmation {
  confirmer: (options: OptionsConfirmation) => Promise<boolean>;
}

const ConfirmationContext = createContext<ContexteConfirmation | null>(null);

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<OptionsConfirmation | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const resolveurRef = useRef<Resolveur | null>(null);

  const confirmer = useCallback((opts: OptionsConfirmation) => {
    return new Promise<boolean>((resolve) => {
      resolveurRef.current = resolve;
      setOptions(opts);
      setOuvert(true);
    });
  }, []);

  function repondre(resultat: boolean) {
    setOuvert(false);
    resolveurRef.current?.(resultat);
    resolveurRef.current = null;
  }

  const statut = options?.statut ?? "danger";
  const variantBouton = statut === "danger" ? "danger" : "primary";

  return (
    <ConfirmationContext.Provider value={{ confirmer }}>
      {children}
      <AlertDialog.Backdrop
        isOpen={ouvert}
        onOpenChange={(open) => {
          if (!open) repondre(false);
        }}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[440px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status={statut} />
              <AlertDialog.Heading>{options?.titre}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <div className="text-sm text-muted whitespace-pre-line">
                {options?.description}
              </div>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="tertiary" onPress={() => repondre(false)}>
                {options?.annulerLibelle ?? "Annuler"}
              </Button>
              <Button variant={variantBouton} onPress={() => repondre(true)}>
                {options?.actionLibelle ?? "Confirmer"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const ctx = useContext(ConfirmationContext);
  if (!ctx) throw new Error("useConfirmation doit etre utilise dans <ConfirmationProvider>");
  return ctx.confirmer;
}
