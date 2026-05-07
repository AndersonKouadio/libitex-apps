"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { inscriptionSchema, type InscriptionDTO } from "@/features/auth/schemas/auth.schema";
import { useInscription } from "@/features/auth/hooks/useInscription";
import { Button, TextField, Label, Input, Select, ListBox } from "@heroui/react";
import { AlertCircle, ArrowLeft, Store } from "lucide-react";

const DEVISES = [
  { id: "XOF", label: "Franc CFA BCEAO (XOF)" },
  { id: "XAF", label: "Franc CFA BEAC (XAF)" },
  { id: "USD", label: "Dollar US (USD)" },
  { id: "EUR", label: "Euro (EUR)" },
];

export default function PageInscription() {
  const router = useRouter();
  const { enCours, erreur: erreurServeur, inscrire } = useInscription();

  const [form, setForm] = useState<InscriptionDTO>({
    nomBoutique: "",
    slugBoutique: "",
    email: "",
    motDePasse: "",
    prenom: "",
    nomFamille: "",
    telephone: "",
    devise: "XOF",
  });
  const [erreur, setErreur] = useState("");

  function maj(champ: keyof InscriptionDTO, valeur: string) {
    setForm((prev) => {
      const next = { ...prev, [champ]: valeur };
      if (champ === "nomBoutique") {
        next.slugBoutique = valeur
          .toLowerCase()
          .normalize("NFD").replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }
      return next;
    });
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");

    const validation = inscriptionSchema.safeParse(form);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Formulaire invalide");
      return;
    }

    const ok = await inscrire(validation.data);
    if (ok) {
      router.push("/dashboard");
    }
  }

  const erreurAffichee = erreur || erreurServeur;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "oklch(0.18 0.02 280)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full" style={{ background: "oklch(0.55 0.17 175 / 5%)" }} />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full" style={{ background: "oklch(0.65 0.17 175 / 5%)" }} />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Retour */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour a la connexion
        </Link>

        {/* En-tete */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.55 0.17 175)" }}>
              <Store size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Creer votre boutique</h1>
              <p className="text-sm text-white/40">Inscription en quelques secondes</p>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-surface rounded-2xl shadow-xl p-6 sm:p-8">
          <form onSubmit={soumettre} className="space-y-5">
            {erreurAffichee && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-danger/10 text-danger text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erreurAffichee}
              </div>
            )}

            {/* Boutique */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Votre boutique</p>
              <div className="space-y-3">
                <TextField isRequired name="nomBoutique" value={form.nomBoutique} onChange={(v) => maj("nomBoutique", v)}>
                  <Label>Nom de la boutique</Label>
                  <Input placeholder="Boutique Dakar Centre" />
                </TextField>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-muted">libitex.com/</span>
                  <span className="text-xs font-mono text-foreground">{form.slugBoutique || "..."}</span>
                </div>
              </div>
            </div>

            {/* Identite */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Votre identite</p>
              <div className="grid grid-cols-2 gap-3">
                <TextField isRequired name="prenom" value={form.prenom} onChange={(v) => maj("prenom", v)}>
                  <Label>Prenom</Label>
                  <Input placeholder="Amadou" />
                </TextField>
                <TextField isRequired name="nomFamille" value={form.nomFamille} onChange={(v) => maj("nomFamille", v)}>
                  <Label>Nom</Label>
                  <Input placeholder="Diallo" />
                </TextField>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <TextField isRequired name="email" type="email" value={form.email} onChange={(v) => maj("email", v)}>
                <Label>Adresse email</Label>
                <Input placeholder="amadou@boutique.sn" />
              </TextField>
              <TextField name="telephone" type="tel" value={form.telephone || ""} onChange={(v) => maj("telephone", v)}>
                <Label>Telephone</Label>
                <Input placeholder="+221 77 000 12 34" />
              </TextField>
            </div>

            {/* Mot de passe + Devise */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField isRequired name="motDePasse" type="password" value={form.motDePasse} onChange={(v) => maj("motDePasse", v)}>
                <Label>Mot de passe</Label>
                <Input placeholder="6 caracteres minimum" />
              </TextField>
              <Select
                name="devise"
                selectedKey={form.devise}
                onSelectionChange={(key) => maj("devise", String(key))}
              >
                <Label>Devise</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {DEVISES.map((d) => (
                      <ListBox.Item key={d.id} id={d.id} textValue={d.label}>{d.label}</ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isDisabled={enCours}
            >
              {enCours ? "Creation en cours..." : "Creer ma boutique"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
