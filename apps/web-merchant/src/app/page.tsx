"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, TextField, Label, Input, FieldError } from "@heroui/react";
import { AlertCircle, Shield } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { connexionSchema, type ConnexionDTO } from "@/features/auth/schemas/auth.schema";

export default function PageConnexion() {
  const router = useRouter();
  const { connecter, verifierMfa, enChargement, token } = useAuth();
  const [form, setForm] = useState<ConnexionDTO>({ email: "", motDePasse: "" });
  const [erreur, setErreur] = useState("");
  const [soumission, setSoumission] = useState(false);

  // Etape MFA : si le 1er post connexion retourne requiresMfa, on stocke le
  // challenge ici et on affiche le formulaire de saisie du code 6 chiffres.
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [mfaEmail, setMfaEmail] = useState<string>("");
  const [codeMfa, setCodeMfa] = useState("");

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
      const res = await connecter(validation.data);
      if (res.requiresMfa) {
        setMfaChallenge(res.mfaChallenge);
        setMfaEmail(res.email);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Identifiants incorrects");
    } finally {
      setSoumission(false);
    }
  }

  async function soumettreMfa(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    if (!mfaChallenge || codeMfa.length !== 6) {
      setErreur("Code à 6 chiffres requis");
      return;
    }
    setSoumission(true);
    try {
      await verifierMfa(mfaChallenge, codeMfa);
      router.push("/dashboard");
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Code MFA invalide");
    } finally {
      setSoumission(false);
    }
  }

  function annulerMfa() {
    setMfaChallenge(null);
    setCodeMfa("");
    setErreur("");
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
          {/* Etape MFA : saisie du code 6 chiffres apres validation email/password */}
          {mfaChallenge ? (
            <form onSubmit={soumettreMfa} className="space-y-4">
              <div className="text-center mb-2">
                <span className="inline-flex h-12 w-12 rounded-xl bg-accent/10 text-accent items-center justify-center">
                  <Shield size={22} />
                </span>
                <h2 className="text-base font-semibold text-foreground mt-3">
                  Code de vérification
                </h2>
                <p className="text-xs text-muted mt-1">
                  Ouvre ton app authenticator et saisis le code à 6 chiffres pour{" "}
                  <span className="font-mono">{mfaEmail}</span>.
                </p>
              </div>

              {erreur && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-danger/10 text-danger text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {erreur}
                </div>
              )}

              <TextField
                isRequired
                value={codeMfa}
                onChange={setCodeMfa}
              >
                <Label className="sr-only">Code MFA</Label>
                <Input
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="text-center text-xl font-mono tracking-[0.4em]"
                  autoFocus
                />
                <FieldError />
              </TextField>

              <Button type="submit" variant="primary" className="w-full" isDisabled={soumission || codeMfa.length !== 6}>
                {soumission ? "Vérification..." : "Vérifier"}
              </Button>

              <Button type="button" variant="ghost" className="w-full text-xs" onPress={annulerMfa}>
                Retour à la connexion
              </Button>
            </form>
          ) : (
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
          )}

          {!mfaChallenge && (
            <p className="mt-6 text-center text-sm text-muted">
              Pas encore de boutique ?{" "}
              <Link href="/inscription" className="font-medium text-accent hover:underline">
                Créer un compte
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
