"use client";

import { useState } from "react";
import {
  Card, Button, TextField, Input, Label, Skeleton, toast,
} from "@heroui/react";
import { Shield, ShieldCheck, Copy, AlertTriangle, KeyRound, Smartphone, Check } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { authAPI, type IMfaSetupResponse } from "@/features/auth/apis/auth.api";

type Etape = "etat" | "setup" | "verification" | "desactivation";

export default function PageSecurite() {
  const { utilisateur, token, mettreAJourUtilisateur } = useAuth();
  const [etape, setEtape] = useState<Etape>("etat");
  const [setupData, setSetupData] = useState<IMfaSetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);

  const mfaActif = utilisateur?.mfaEnabled ?? false;

  async function lancerSetup() {
    if (!token) return;
    setEnCours(true);
    try {
      const data = await authAPI.setupMfa(token);
      setSetupData(data);
      setEtape("setup");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Erreur de mise en place");
    } finally {
      setEnCours(false);
    }
  }

  async function valider() {
    if (!token) return;
    if (!/^\d{6}$/.test(code)) {
      toast.warning("Le code doit contenir 6 chiffres");
      return;
    }
    setEnCours(true);
    try {
      await authAPI.activerMfa(token, code);
      toast.success("MFA activé sur votre compte");
      setCode("");
      setSetupData(null);
      setEtape("etat");
      mettreAJourUtilisateur({ mfaEnabled: true });
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setEnCours(false);
    }
  }

  async function desactiver() {
    if (!token) return;
    if (!motDePasse) {
      toast.warning("Mot de passe requis");
      return;
    }
    setEnCours(true);
    try {
      await authAPI.desactiverMfa(token, motDePasse);
      toast.success("MFA désactivé");
      setMotDePasse("");
      setEtape("etat");
      mettreAJourUtilisateur({ mfaEnabled: false });
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Désactivation impossible");
    } finally {
      setEnCours(false);
    }
  }

  function copierSecret() {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret);
    toast.success("Secret copié");
  }

  if (!utilisateur) {
    return (
      <PageContainer>
        <Skeleton className="h-32 rounded-xl" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titre="Sécurité du compte"
        description="Active la double authentification (TOTP) pour renforcer la sécurité de ton compte."
      />

      {/* Etat actuel */}
      {etape === "etat" && (
        <Card>
          <Card.Content className="p-5">
            <div className="flex items-start gap-4">
              <span className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                mfaActif ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
              }`}>
                {mfaActif ? <ShieldCheck size={24} /> : <Shield size={24} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-foreground">
                    Double authentification (MFA)
                  </h3>
                  {mfaActif ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
                      Activée
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted/10 text-muted">
                      Désactivée
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted mt-1">
                  {mfaActif
                    ? "À chaque connexion, tu devras saisir un code à 6 chiffres généré par ton application authenticator (Google Authenticator, Authy, 1Password...)."
                    : "Ajoute une couche de sécurité supplémentaire à ton compte. Tu auras besoin d'une app comme Google Authenticator, Authy ou 1Password."}
                </p>
                <div className="mt-4">
                  {mfaActif ? (
                    <Button
                      variant="ghost"
                      className="gap-1.5 text-danger hover:bg-danger/5"
                      onPress={() => setEtape("desactivation")}
                    >
                      <AlertTriangle size={14} />
                      Désactiver la MFA
                    </Button>
                  ) : (
                    <Button variant="primary" className="gap-1.5" onPress={lancerSetup} isDisabled={enCours}>
                      <Shield size={14} />
                      {enCours ? "..." : "Activer la double authentification"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Setup : afficher secret + URL */}
      {etape === "setup" && setupData && (
        <Card>
          <Card.Header>
            <Card.Title className="text-base flex items-center gap-2">
              <Smartphone size={18} className="text-accent" />
              Étape 1 — Configure ton authenticator
            </Card.Title>
          </Card.Header>
          <Card.Content className="p-5 space-y-5">
            <div>
              <p className="text-sm text-foreground mb-2">
                Dans ton app authenticator, choisis <strong>« Saisie manuelle »</strong> et entre :
              </p>
              <ul className="text-sm space-y-1.5 mb-3">
                <li>
                  <span className="text-muted">Compte :</span>{" "}
                  <span className="font-mono text-foreground">{utilisateur.email}</span>
                </li>
                <li>
                  <span className="text-muted">Émetteur :</span>{" "}
                  <span className="font-mono text-foreground">LIBITEX</span>
                </li>
                <li>
                  <span className="text-muted">Type :</span>{" "}
                  <span className="text-foreground">Basé sur le temps (TOTP)</span>
                </li>
              </ul>
              <div className="rounded-lg border border-border bg-muted/5 p-3">
                <p className="text-xs text-muted uppercase tracking-wider mb-1.5">Clé secrète</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm text-foreground break-all select-all">
                    {setupData.secret}
                  </code>
                  <Button
                    variant="ghost"
                    className="gap-1 text-xs shrink-0"
                    onPress={copierSecret}
                    aria-label="Copier le secret"
                  >
                    <Copy size={12} />
                    Copier
                  </Button>
                </div>
              </div>
            </div>

            <details className="text-xs">
              <summary className="cursor-pointer text-muted hover:text-foreground">
                URL otpauth (pour génération de QR code manuelle)
              </summary>
              <div className="mt-2 rounded-lg border border-border bg-muted/5 p-3 break-all font-mono text-[11px]">
                {setupData.urlProvisionning}
              </div>
            </details>

            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <KeyRound size={14} className="text-accent" />
                Étape 2 — Vérifie avec le 1er code
              </h4>
              <p className="text-xs text-muted mb-3">
                Ton app affiche maintenant un code à 6 chiffres qui change toutes les 30 secondes.
                Saisis-le pour activer définitivement la MFA.
              </p>
              <div className="flex items-center gap-3">
                <TextField value={code} onChange={setCode} className="flex-1 max-w-[200px]">
                  <Label className="sr-only">Code MFA</Label>
                  <Input
                    placeholder="123456"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </TextField>
                <Button
                  variant="primary"
                  className="gap-1.5"
                  onPress={valider}
                  isDisabled={enCours || code.length !== 6}
                >
                  <Check size={14} />
                  Activer
                </Button>
                <Button variant="ghost" onPress={() => { setEtape("etat"); setSetupData(null); setCode(""); }}>
                  Annuler
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Desactivation : demande mot de passe */}
      {etape === "desactivation" && (
        <Card>
          <Card.Header>
            <Card.Title className="text-base flex items-center gap-2">
              <AlertTriangle size={18} className="text-danger" />
              Désactiver la MFA
            </Card.Title>
          </Card.Header>
          <Card.Content className="p-5 space-y-4">
            <p className="text-sm text-muted">
              Confirme ton mot de passe pour désactiver la double authentification. Ton compte
              sera moins protégé.
            </p>
            <TextField value={motDePasse} onChange={setMotDePasse} className="max-w-[400px]">
              <Label>Mot de passe</Label>
              <Input type="password" autoComplete="current-password" />
            </TextField>
            <div className="flex items-center gap-3">
              <Button
                variant="danger"
                className="gap-1.5"
                onPress={desactiver}
                isDisabled={enCours || !motDePasse}
              >
                <AlertTriangle size={14} />
                {enCours ? "..." : "Désactiver la MFA"}
              </Button>
              <Button variant="ghost" onPress={() => { setEtape("etat"); setMotDePasse(""); }}>
                Annuler
              </Button>
            </div>
          </Card.Content>
        </Card>
      )}
    </PageContainer>
  );
}
