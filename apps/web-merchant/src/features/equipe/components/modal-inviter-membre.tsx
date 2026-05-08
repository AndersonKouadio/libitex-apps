"use client";

import { useState } from "react";
import { Modal, Button, TextField, Label, Input, toast } from "@heroui/react";
import { UserPlus } from "lucide-react";
import { inviterMembreSchema, type InviterMembreDTO } from "../schemas/equipe.schema";
import { useInviterMembreMutation } from "../queries/equipe.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { SelecteurRole, type RoleInvitable } from "./selecteur-role";
import { SelecteurAcces } from "./selecteur-acces";
import { IdentifiantsTemporaires, type IdentifiantsCrees } from "./identifiants-temporaires";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

const FORM_VIDE: InviterMembreDTO = {
  email: "",
  prenom: "",
  nomFamille: "",
  telephone: "",
  role: "CASHIER",
  accessAllLocations: true,
  locationIds: [],
};

export function ModalInviterMembre({ ouvert, onFermer }: Props) {
  const mutation = useInviterMembreMutation();
  const { data: emplacements } = useEmplacementListQuery();

  const [form, setForm] = useState<InviterMembreDTO>(FORM_VIDE);
  const [erreur, setErreur] = useState("");
  const [resultat, setResultat] = useState<IdentifiantsCrees | null>(null);

  function maj<K extends keyof InviterMembreDTO>(champ: K, valeur: InviterMembreDTO[K]) {
    setForm((p) => ({ ...p, [champ]: valeur }));
  }

  function reset() {
    setForm(FORM_VIDE);
    setErreur("");
    setResultat(null);
  }

  async function soumettre() {
    setErreur("");
    const validation = inviterMembreSchema.safeParse({
      ...form,
      telephone: form.telephone || undefined,
    });
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Données invalides");
      return;
    }
    try {
      const res = await mutation.mutateAsync(validation.data);
      if (res.motDePasseTemporaire) {
        setResultat({
          motDePasse: res.motDePasseTemporaire,
          nom: `${res.membre.prenom} ${res.membre.nomFamille}`,
          email: res.membre.email,
        });
      } else {
        toast.success(res.message);
        reset();
        onFermer();
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  function fermer() {
    reset();
    onFermer();
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(open) => { if (!open) fermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <UserPlus className="size-5" />
            </Modal.Icon>
            <Modal.Heading>{resultat ? "Invitation créée" : "Inviter un membre"}</Modal.Heading>
          </Modal.Header>

          {resultat ? (
            <IdentifiantsTemporaires identifiants={resultat} onFermer={fermer} />
          ) : (
            <>
              <Modal.Body className="space-y-4">
                {erreur && (
                  <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>
                )}

                <TextField isRequired type="email" value={form.email} onChange={(v) => maj("email", v)}>
                  <Label>Adresse email</Label>
                  <Input placeholder="amadou@boutique.sn" autoComplete="off" />
                </TextField>

                <div className="grid grid-cols-2 gap-3">
                  <TextField isRequired value={form.prenom} onChange={(v) => maj("prenom", v)}>
                    <Label>Prénom</Label>
                    <Input placeholder="Amadou" />
                  </TextField>
                  <TextField isRequired value={form.nomFamille} onChange={(v) => maj("nomFamille", v)}>
                    <Label>Nom</Label>
                    <Input placeholder="Diallo" />
                  </TextField>
                </div>

                <TextField type="tel" value={form.telephone ?? ""} onChange={(v) => maj("telephone", v)}>
                  <Label>Téléphone (optionnel)</Label>
                  <Input placeholder="+221 77 000 12 34" />
                </TextField>

                <SelecteurRole
                  valeur={form.role as RoleInvitable}
                  onChange={(r) => {
                    setForm((p) => ({
                      ...p,
                      role: r,
                      accessAllLocations: r === "ADMIN" ? true : p.accessAllLocations,
                    }));
                  }}
                />

                <SelecteurAcces
                  accessAllLocations={form.accessAllLocations}
                  locationIds={form.locationIds ?? []}
                  emplacements={emplacements ?? []}
                  onChange={(data) => setForm((p) => ({ ...p, ...data }))}
                  disabled={form.role === "ADMIN"}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" slot="close">Annuler</Button>
                <Button variant="primary" onPress={soumettre} isDisabled={mutation.isPending}>
                  {mutation.isPending ? "Création..." : "Créer le compte"}
                </Button>
              </Modal.Footer>
            </>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
