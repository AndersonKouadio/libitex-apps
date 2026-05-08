"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, TextField, Label, Input, FieldError, Card, toast } from "@heroui/react";
import { KeyRound, AlertCircle, ArrowLeft } from "lucide-react";
import { authAPI } from "@/features/auth/apis/auth.api";
import { reinitialiserMotDePasseSchema } from "@/features/auth/schemas/auth.schema";

function FormulaireReset() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    const v = reinitialiserMotDePasseSchema.safeParse({ token, nouveauMotDePasse, confirmation });
    if (!v.success) {
      setErreur(v.error.issues[0]?.message ?? "Données invalides");
      return;
    }
    setEnCours(true);
    try {
      await authAPI.reinitialiser({ token: v.data.token, nouveauMotDePasse: v.data.nouveauMotDePasse });
      toast.success("Mot de passe mis à jour. Connectez-vous.");
      router.push("/");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Lien invalide ou expiré");
    } finally {
      setEnCours(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <div className="w-10 h-10 rounded-full bg-danger/10 text-danger inline-flex items-center justify-center">
          <AlertCircle size={20} />
        </div>
        <p className="text-sm font-semibold text-foreground">Lien invalide</p>
        <p className="text-xs text-muted">
          Le lien de réinitialisation est manquant. Demandez un nouveau lien.
        </p>
        <Link
          href="/mot-de-passe-oublie"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
        >
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={soumettre} className="space-y-4">
      {erreur && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-danger/10 text-danger text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {erreur}
        </div>
      )}

      <TextField isRequired type="password" value={nouveauMotDePasse} onChange={setNouveauMotDePasse}>
        <Label>Nouveau mot de passe</Label>
        <Input placeholder="8 caractères minimum" autoComplete="new-password" autoFocus />
        <FieldError />
      </TextField>

      <TextField isRequired type="password" value={confirmation} onChange={setConfirmation}>
        <Label>Confirmer le nouveau mot de passe</Label>
        <Input placeholder="Saisir à nouveau" autoComplete="new-password" />
        <FieldError />
      </TextField>

      <Button type="submit" variant="primary" className="w-full" isDisabled={enCours}>
        {enCours ? "Enregistrement..." : "Définir le nouveau mot de passe"}
      </Button>

      <Link
        href="/"
        className="flex items-center justify-center gap-1.5 text-xs text-muted hover:text-foreground"
      >
        <ArrowLeft size={12} />
        Retour à la connexion
      </Link>
    </form>
  );
}

export default function PageReinitialiser() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-sidebar safe-top safe-bottom">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent text-accent-foreground inline-flex items-center justify-center mb-3">
            <KeyRound size={22} />
          </div>
          <h1 className="text-xl font-bold text-white">Choisir un nouveau mot de passe</h1>
        </div>

        <Card className="shadow-xl">
          <Card.Content className="p-6 sm:p-8">
            <Suspense fallback={<div className="text-center text-sm text-muted">Chargement...</div>}>
              <FormulaireReset />
            </Suspense>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
