"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, TextField, Label, Input, FieldError } from "@heroui/react";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { connexionSchema, type ConnexionDTO } from "@/features/auth/schemas/auth.schema";

export default function PageConnexion() {
  const router = useRouter();
  const { connecter, enChargement, token } = useAuth();
  const [form, setForm] = useState<ConnexionDTO>({ email: "", motDePasse: "" });
  const [erreur, setErreur] = useState("");
  const [soumission, setSoumission] = useState(false);

  if (!enChargement && token) {
    router.push("/dashboard");
    return null;
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");

    const validation = connexionSchema.safeParse(form);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Formulaire invalide");
      return;
    }

    setSoumission(true);
    try {
      await connecter(validation.data);
      router.push("/dashboard");
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Identifiants incorrects");
    } finally {
      setSoumission(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-navy">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-accent/5" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-accent/5" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-accent">LIBITEX</h1>
          <p className="mt-2.5 text-sm text-white/50">Espace commerçant</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-xl p-7">
          <form onSubmit={soumettre} className="space-y-4">
            {erreur && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-danger/10 text-danger text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erreur}
              </div>
            )}

            <TextField
              isRequired
              type="email"
              name="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            >
              <Label>Adresse email</Label>
              <Input placeholder="nom@boutique.sn" inputMode="email" autoComplete="email" autoCapitalize="none" autoFocus />
              <FieldError />
            </TextField>

            <TextField
              isRequired
              type="password"
              name="motDePasse"
              value={form.motDePasse}
              onChange={(v) => setForm({ ...form, motDePasse: v })}
            >
              <Label>Mot de passe</Label>
              <Input placeholder="Votre mot de passe" autoComplete="current-password" />
              <FieldError />
            </TextField>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isDisabled={soumission}
            >
              {soumission ? "Connexion en cours..." : "Se connecter"}
            </Button>

            <div className="text-center">
              <Link
                href="/mot-de-passe-oublie"
                className="text-xs text-muted hover:text-accent hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Pas encore de boutique ?{" "}
            <Link href="/inscription" className="font-medium text-accent hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
