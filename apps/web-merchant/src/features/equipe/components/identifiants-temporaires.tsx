"use client";

import { useState } from "react";
import { Modal, Button, toast } from "@heroui/react";
import { Copy, Check, KeyRound, AlertCircle } from "lucide-react";

export interface IdentifiantsCrees {
  motDePasse: string;
  nom: string;
  email: string;
}

interface Props {
  identifiants: IdentifiantsCrees;
  onFermer: () => void;
}

/** Vue succes apres creation d'un membre avec mot de passe temporaire. */
export function IdentifiantsTemporaires({ identifiants, onFermer }: Props) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(identifiants.motDePasse);
      setCopie(true);
      toast.success("Mot de passe copié");
      setTimeout(() => setCopie(false), 2000);
    } catch {
      toast.danger("Impossible de copier — sélectionnez et copiez manuellement");
    }
  }

  return (
    <>
      <Modal.Body className="space-y-4">
        <div className="rounded-xl bg-success/10 border border-success/20 p-4">
          <p className="text-sm font-semibold text-success">
            {identifiants.nom} a été ajouté à la boutique.
          </p>
          <p className="text-xs text-success/80 mt-1">
            Communiquez ces identifiants au nouveau membre. Le mot de passe ne sera plus jamais affiché.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted mb-1">Adresse email</p>
            <p className="font-mono text-sm bg-surface-secondary rounded-lg px-3 py-2 break-all">
              {identifiants.email}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted mb-1 flex items-center gap-1.5">
              <KeyRound size={12} />
              Mot de passe temporaire
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-base font-semibold bg-warning/10 text-warning rounded-lg px-3 py-2 select-all tracking-wider">
                {identifiants.motDePasse}
              </code>
              <Button variant="secondary" className="gap-1.5" onPress={copier}>
                {copie ? <Check size={14} /> : <Copy size={14} />}
                {copie ? "Copié" : "Copier"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-warning/10 text-warning text-xs">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>
            Demandez au nouveau membre de modifier son mot de passe à sa première connexion.
          </span>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" className="w-full" onPress={onFermer}>
          J'ai noté les identifiants, fermer
        </Button>
      </Modal.Footer>
    </>
  );
}
