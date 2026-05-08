"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField, Label, Input, FieldError, Card } from "@heroui/react";
import { KeyRound, AlertCircle, ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useChangerMotDePasseMutation } from "@/features/auth/queries/changer-mot-de-passe.mutation";
import { changerMotDePasseSchema, type ChangerMotDePasseDTO } from "@/features/auth/schemas/auth.schema";

const VIDE: ChangerMotDePasseDTO = {
  motDePasseActuel: "",
  nouveauMotDePasse: "",
  confirmation: "",
};

export default function PageChangerMotDePasse() {
  const router = useRouter();
  const { token, utilisateur, enChargement, deconnecter } = useAuth();
  const mutation = useChangerMotDePasseMutation();
  const [form, setForm] = useState<ChangerMotDePasseDTO>(VIDE);
  const [erreur, setErreur] = useState("");

  const obligatoire = utilisateur?.mustChangePassword ?? false;

  useEffect(() => {
    if (!enChargement && !token) router.push("/");
  }, [enChargement, token, router]);

  if (enChargement || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function maj<K extends keyof ChangerMotDePasseDTO>(champ: K, valeur: ChangerMotDePasseDTO[K]) {
    setForm((p) => ({ ...p, [champ]: valeur }));
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    const validation = changerMotDePasseSchema.safeParse(form);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Données invalides");
      return;
    }
    try {
      await mutation.mutateAsync({
        motDePasseActuel: validation.data.motDePasseActuel,
        nouveauMotDePasse: validation.data.nouveauMotDePasse,
      });
      router.push(obligatoire ? "/dashboard" : "/parametres");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-sidebar safe-top safe-bottom">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent text-accent-foreground inline-flex items-center justify-center mb-3">
            <KeyRound size={22} />
          </div>
          <h1 className="text-xl font-bold text-white">
            {obligatoire ? "Bienvenue, choisissez votre mot de passe" : "Modifier votre mot de passe"}
          </h1>
          {obligatoire && (
            <p className="text-sm text-white/50 mt-2 max-w-sm mx-auto">
              Pour des raisons de sécurité, votre mot de passe temporaire doit être remplacé
              avant d'accéder à la boutique.
            </p>
          )}
        </div>

        <Card className="shadow-xl">
          <Card.Content className="p-6 sm:p-8">
            <form onSubmit={soumettre} className="space-y-4">
              {erreur && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-danger/10 text-danger text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {erreur}
                </div>
              )}

              <TextField
                isRequired
                type="password"
                value={form.motDePasseActuel}
                onChange={(v) => maj("motDePasseActuel", v)}
              >
                <Label>{obligatoire ? "Mot de passe temporaire reçu" : "Mot de passe actuel"}</Label>
                <Input placeholder="••••••••" autoComplete="current-password" autoFocus />
                <FieldError />
              </TextField>

              <TextField
                isRequired
                type="password"
                value={form.nouveauMotDePasse}
                onChange={(v) => maj("nouveauMotDePasse", v)}
              >
                <Label>Nouveau mot de passe</Label>
                <Input placeholder="8 caractères minimum" autoComplete="new-password" />
                <FieldError />
              </TextField>

              <TextField
                isRequired
                type="password"
                value={form.confirmation}
                onChange={(v) => maj("confirmation", v)}
              >
                <Label>Confirmer le nouveau mot de passe</Label>
                <Input placeholder="Saisir à nouveau" autoComplete="new-password" />
                <FieldError />
              </TextField>

              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-accent/5 text-accent text-xs">
                <ShieldCheck size={14} className="shrink-0 mt-0.5" />
                <span>Choisissez un mot de passe unique, que vous n'utilisez nulle part ailleurs.</span>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isDisabled={mutation.isPending}
              >
                {mutation.isPending ? "Enregistrement..." : "Mettre à jour le mot de passe"}
              </Button>

              {obligatoire && (
                <Button
                  variant="ghost"
                  className="w-full gap-1.5 text-muted hover:text-foreground"
                  onPress={() => { deconnecter(); router.push("/"); }}
                >
                  <LogOut size={14} />
                  Annuler et se déconnecter
                </Button>
              )}
            </form>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
