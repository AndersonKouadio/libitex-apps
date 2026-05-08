"use client";

import { useState, useEffect } from "react";
import { Modal, Button, TextField, Label, Input } from "@heroui/react";
import { Pencil } from "lucide-react";
import { ChampSecteur } from "@/features/auth/components/champ-secteur";
import type { SecteurActivite } from "@/features/auth/types/auth.type";
import { useModifierBoutiqueMutation } from "../queries/boutique.mutations";
import type { IBoutiqueResume, IBoutiqueDetail } from "../types/boutique.type";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  /** Si fourni, modale en mode edition (boutique pre-remplie). */
  boutique: (IBoutiqueResume & Partial<IBoutiqueDetail>) | null;
}

export function ModalModifierBoutique({ ouvert, onFermer, boutique }: Props) {
  const mutation = useModifierBoutiqueMutation();
  const [nom, setNom] = useState("");
  const [secteur, setSecteur] = useState<SecteurActivite>("AUTRE");
  const [devise, setDevise] = useState("XOF");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!boutique) return;
    setNom(boutique.nom);
    setSecteur(boutique.secteurActivite as SecteurActivite);
    setDevise(boutique.devise);
    setEmail(boutique.email ?? "");
    setTelephone(boutique.telephone ?? "");
    setAdresse(boutique.adresse ?? "");
    setErreur("");
  }, [boutique]);

  async function soumettre() {
    if (!boutique) return;
    setErreur("");
    if (!nom.trim()) {
      setErreur("Le nom est requis");
      return;
    }
    try {
      await mutation.mutateAsync({
        tenantId: boutique.id,
        data: {
          nom,
          secteurActivite: secteur,
          devise,
          email: email || undefined,
          telephone: telephone || undefined,
          adresse: adresse || undefined,
        },
      });
      onFermer();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  if (!boutique) return null;

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <Pencil className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Modifier la boutique</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>
            )}

            <TextField isRequired value={nom} onChange={setNom}>
              <Label>Nom de la boutique</Label>
              <Input autoFocus />
            </TextField>

            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-muted">Identifiant URL :</span>
              <span className="text-xs font-mono text-foreground">{boutique.slug}</span>
              <span className="text-[10px] text-muted/70">(non modifiable)</span>
            </div>

            <ChampSecteur isRequired valeur={secteur} onChange={setSecteur} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField value={devise} onChange={setDevise}>
                <Label>Devise</Label>
                <Input placeholder="XOF" />
              </TextField>
              <TextField type="email" value={email} onChange={setEmail}>
                <Label>Email de contact</Label>
                <Input placeholder="contact@boutique.sn" />
              </TextField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField value={telephone} onChange={setTelephone}>
                <Label>Téléphone</Label>
                <Input placeholder="+221 77 000 12 34" type="tel" />
              </TextField>
              <TextField value={adresse} onChange={setAdresse}>
                <Label>Adresse</Label>
                <Input placeholder="Plateau, Dakar" />
              </TextField>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
