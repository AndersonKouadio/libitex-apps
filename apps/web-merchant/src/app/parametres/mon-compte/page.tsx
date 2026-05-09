"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Button, Card, TextField, Label, Input, Skeleton, toast,
  AlertDialog,
} from "@heroui/react";
import { Save, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { authAPI } from "@/features/auth/apis/auth.api";

export default function PageMonCompte() {
  const router = useRouter();
  const { token, utilisateur, deconnecter, mettreAJourUtilisateur } = useAuth();

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nomFamille, setNomFamille] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");

  const [dialogueSupprOuvert, setDialogueSupprOuvert] = useState(false);
  const [motDePasseSuppr, setMotDePasseSuppr] = useState("");
  const [erreurSuppr, setErreurSuppr] = useState("");
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  useEffect(() => {
    if (!token) return;
    setChargement(true);
    authAPI.obtenirProfil(token)
      .then((p) => {
        setPrenom(p.prenom);
        setNomFamille(p.nomFamille);
        setTelephone(p.telephone ?? "");
        setEmail(p.email);
      })
      .catch((err: unknown) => {
        toast.danger(err instanceof Error ? err.message : "Impossible de charger le profil");
      })
      .finally(() => setChargement(false));
  }, [token]);

  async function enregistrer() {
    if (!token) return;
    if (!prenom.trim() || !nomFamille.trim()) {
      toast.danger("Le prénom et le nom sont requis");
      return;
    }
    setEnregistrement(true);
    try {
      const profil = await authAPI.modifierProfil(token, {
        prenom,
        nomFamille,
        telephone: telephone || undefined,
      });
      mettreAJourUtilisateur({ prenom: profil.prenom, nomFamille: profil.nomFamille });
      toast.success("Profil mis à jour");
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setEnregistrement(false);
    }
  }

  async function supprimerCompte() {
    if (!token) return;
    setErreurSuppr("");
    if (!motDePasseSuppr) {
      setErreurSuppr("Mot de passe requis");
      return;
    }
    setSuppressionEnCours(true);
    try {
      await authAPI.supprimerCompte(token, motDePasseSuppr);
      toast.success("Compte supprimé");
      deconnecter();
      router.push("/");
    } catch (err: unknown) {
      setErreurSuppr(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSuppressionEnCours(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        titre="Mon compte"
        description="Vos informations personnelles. L'email reste fixé à l'inscription pour préserver l'historique d'audit."
      />

      <Card>
        <Card.Content className="p-6 space-y-5">
          {chargement ? (
            <div className="space-y-3">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField isRequired value={prenom} onChange={setPrenom}>
                  <Label>Prénom</Label>
                  <Input autoFocus />
                </TextField>
                <TextField isRequired value={nomFamille} onChange={setNomFamille}>
                  <Label>Nom</Label>
                  <Input />
                </TextField>
              </div>

              <TextField type="email" value={email} isReadOnly>
                <Label>Email</Label>
                <Input className="cursor-not-allowed opacity-70" />
              </TextField>

              <TextField value={telephone} onChange={setTelephone}>
                <Label>Téléphone</Label>
                <Input placeholder="+221 77 000 12 34" type="tel" />
              </TextField>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  variant="ghost"
                  className="text-sm"
                  onPress={() => router.push("/parametres")}
                >
                  Retour
                </Button>
                <Button
                  variant="primary"
                  className="gap-1.5"
                  onPress={enregistrer}
                  isDisabled={enregistrement}
                >
                  <Save size={16} />
                  {enregistrement ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </>
          )}
        </Card.Content>
      </Card>

      {utilisateur && (
        <Card className="mt-6 border-danger/30">
          <Card.Content className="p-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Supprimer mon compte</p>
              <p className="text-xs text-muted mt-1">
                Action définitive. Toutes les boutiques dont vous êtes l'unique propriétaire seront aussi supprimées (catalogue, stock, ventes inclus). Les boutiques partagées avec d'autres propriétaires sont conservées.
              </p>
            </div>
            <Button
              variant="danger"
              className="gap-1.5 shrink-0"
              onPress={() => {
                setMotDePasseSuppr("");
                setErreurSuppr("");
                setDialogueSupprOuvert(true);
              }}
            >
              <Trash2 size={14} />
              Supprimer le compte
            </Button>
          </Card.Content>
        </Card>
      )}

      <AlertDialog.Backdrop
        isOpen={dialogueSupprOuvert}
        onOpenChange={(open) => { if (!open) setDialogueSupprOuvert(false); }}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[440px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Confirmer la suppression du compte</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="space-y-3">
              <p className="text-sm text-muted">
                Saisissez votre mot de passe pour confirmer. Cette action est définitive.
              </p>
              {erreurSuppr && (
                <div className="px-3 py-2 rounded-lg bg-danger/10 text-danger text-sm">
                  {erreurSuppr}
                </div>
              )}
              <TextField type="password" value={motDePasseSuppr} onChange={setMotDePasseSuppr}>
                <Label>Mot de passe</Label>
                <Input autoFocus />
              </TextField>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="tertiary" onPress={() => setDialogueSupprOuvert(false)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                onPress={supprimerCompte}
                isDisabled={suppressionEnCours}
              >
                {suppressionEnCours ? "Suppression..." : "Supprimer définitivement"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </PageContainer>
  );
}
