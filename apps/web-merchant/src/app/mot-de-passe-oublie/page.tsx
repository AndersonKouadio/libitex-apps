"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, TextField, Label, Input, FieldError, Card } from "@heroui/react";
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { authAPI } from "@/features/auth/apis/auth.api";
import { motDePasseOublieSchema } from "@/features/auth/schemas/auth.schema";

export default function PageMotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    const v = motDePasseOublieSchema.safeParse({ email });
    if (!v.success) {
      setErreur(v.error.issues[0]?.message ?? "Email invalide");
      return;
    }
    setEnCours(true);
    try {
      await authAPI.demanderReset(v.data.email);
      setEnvoye(true);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-sidebar safe-top safe-bottom">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent text-accent-foreground inline-flex items-center justify-center mb-3">
            <Mail size={22} />
          </div>
          <h1 className="text-xl font-bold text-white">Mot de passe oublié</h1>
          <p className="text-sm text-white/50 mt-2 max-w-sm mx-auto">
            Indiquez l'adresse email associée à votre compte. Nous vous enverrons un lien pour
            choisir un nouveau mot de passe.
          </p>
        </div>

        <Card className="shadow-xl">
          <Card.Content className="p-6 sm:p-8">
            {envoye ? (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-success/10 text-success inline-flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Email envoyé</p>
                  <p className="text-xs text-muted mt-1">
                    Si un compte existe pour <span className="font-medium">{email}</span>, vous
                    recevrez un email avec le lien de réinitialisation. Le lien est valable 1 heure.
                  </p>
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                >
                  <ArrowLeft size={14} />
                  Retour à la connexion
                </Link>
              </div>
            ) : (
              <form onSubmit={soumettre} className="space-y-4">
                {erreur && (
                  <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-danger/10 text-danger text-sm">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    {erreur}
                  </div>
                )}

                <TextField isRequired type="email" value={email} onChange={setEmail}>
                  <Label>Adresse email</Label>
                  <Input placeholder="nom@boutique.sn" inputMode="email" autoComplete="email" autoCapitalize="none" autoFocus />
                  <FieldError />
                </TextField>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isDisabled={enCours}
                >
                  {enCours ? "Envoi..." : "Envoyer le lien"}
                </Button>

                <Link
                  href="/"
                  className="flex items-center justify-center gap-1.5 text-xs text-muted hover:text-foreground"
                >
                  <ArrowLeft size={12} />
                  Retour à la connexion
                </Link>
              </form>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
