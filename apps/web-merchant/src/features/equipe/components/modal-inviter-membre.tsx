"use client";

import { useState } from "react";
import { Modal, Button, TextField, Label, Input, toast } from "@heroui/react";
import { UserPlus, Copy, Check, KeyRound, AlertCircle } from "lucide-react";
import { inviterMembreSchema, type InviterMembreDTO } from "../schemas/equipe.schema";
import { useInviterMembreMutation } from "../queries/equipe.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { SelecteurRole, type RoleInvitable } from "./selecteur-role";
import { SelecteurAcces } from "./selecteur-acces";

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
  const [resultat, setResultat] = useState<{ motDePasse: string; nom: string; email: string } | null>(null);
  const [copie, setCopie] = useState(false);

  function maj<K extends keyof InviterMembreDTO>(champ: K, valeur: InviterMembreDTO[K]) {
    setForm((p) => ({ ...p, [champ]: valeur }));
  }

  function reset() {
    setForm(FORM_VIDE);
    setErreur("");
    setResultat(null);
    setCopie(false);
  }

  async function copierMotDePasse() {
    if (!resultat) return;
    try {
      await navigator.clipboard.writeText(resultat.motDePasse);
      setCopie(true);
      toast.success("Mot de passe copié");
      setTimeout(() => setCopie(false), 2000);
    } catch {
      toast.danger("Impossible de copier — sélectionnez et copiez manuellement");
    }
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
            <>
              <Modal.Body className="space-y-4">
                <div className="rounded-xl bg-success/10 border border-success/20 p-4">
                  <p className="text-sm font-semibold text-success">
                    {resultat.nom} a été ajouté à la boutique.
                  </p>
                  <p className="text-xs text-success/80 mt-1">
                    Communiquez ces identifiants au nouveau membre. Le mot de passe ne sera plus jamais affiché.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted mb-1">Adresse email</p>
                    <p className="font-mono text-sm bg-surface-secondary rounded-lg px-3 py-2 break-all">
                      {resultat.email}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted mb-1 flex items-center gap-1.5">
                      <KeyRound size={12} />
                      Mot de passe temporaire
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-base font-semibold bg-warning/10 text-warning rounded-lg px-3 py-2 select-all tracking-wider">
                        {resultat.motDePasse}
                      </code>
                      <Button variant="secondary" className="gap-1.5" onPress={copierMotDePasse}>
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
                <Button variant="primary" className="w-full" onPress={fermer}>
                  J'ai noté les identifiants, fermer
                </Button>
              </Modal.Footer>
            </>
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
                      // Un ADMIN doit avoir l'accès à tous les emplacements
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
