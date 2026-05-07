"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@heroui/react";
import { AlertCircle, ArrowLeft, Store } from "lucide-react";
import { inscriptionSchema, type InscriptionDTO } from "@/features/auth/schemas/auth.schema";
import { useInscription } from "@/features/auth/hooks/useInscription";
import { ChampsBoutique } from "@/features/auth/components/champs-boutique";
import { ChampsIdentite } from "@/features/auth/components/champs-identite";
import { ChampsAcces } from "@/features/auth/components/champs-acces";
import { ChampSecteur } from "@/features/auth/components/champ-secteur";
import { slugifier } from "@/features/auth/utils/slug";
import type { SecteurActivite } from "@/features/auth/types/auth.type";

const FORM_VIDE: InscriptionDTO = {
  nomBoutique: "",
  slugBoutique: "",
  email: "",
  motDePasse: "",
  prenom: "",
  nomFamille: "",
  telephone: "",
  devise: "XOF",
  secteurActivite: "AUTRE",
};

export default function PageInscription() {
  const router = useRouter();
  const { enCours, erreur: erreurServeur, inscrire } = useInscription();
  const [form, setForm] = useState<InscriptionDTO>(FORM_VIDE);
  const [erreur, setErreur] = useState("");

  function maj(champ: keyof InscriptionDTO, valeur: string) {
    setForm((prev) => {
      const next = { ...prev, [champ]: valeur };
      if (champ === "nomBoutique") next.slugBoutique = slugifier(valeur);
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
    if (ok) router.push("/dashboard");
  }

  const erreurAffichee = erreur || erreurServeur;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-sidebar">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-accent/5" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-accent/5" />
      </div>

      <div className="relative w-full max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour a la connexion
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent">
            <Store size={20} className="text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Créer votre boutique</h1>
            <p className="text-sm text-white/40">Inscription en quelques secondes</p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-xl p-6 sm:p-8">
          <form onSubmit={soumettre} className="space-y-5">
            {erreurAffichee && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-danger/10 text-danger text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erreurAffichee}
              </div>
            )}

            <ChampsBoutique
              nomBoutique={form.nomBoutique}
              slugBoutique={form.slugBoutique}
              onChange={maj}
            />

            <ChampSecteur
              isRequired
              valeur={form.secteurActivite as SecteurActivite}
              onChange={(s) => setForm((p) => ({ ...p, secteurActivite: s }))}
            />

            <ChampsIdentite
              prenom={form.prenom}
              nomFamille={form.nomFamille}
              email={form.email}
              telephone={form.telephone || ""}
              onChange={maj}
            />

            <ChampsAcces
              motDePasse={form.motDePasse}
              devise={form.devise}
              onChange={maj}
            />

            <Button type="submit" variant="primary" className="w-full" isDisabled={enCours}>
              {enCours ? "Création en cours..." : "Créer ma boutique"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
