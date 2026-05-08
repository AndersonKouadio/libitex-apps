"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@heroui/react";
import { Topbar } from "@/components/layout/topbar";
import { Store, Users, ChevronRight, Building2, Tag, ShieldCheck } from "lucide-react";
import { ModalChangerMotDePasse } from "@/features/auth/components/modal-changer-mot-de-passe";

interface SectionConfig {
  href?: string;
  action?: "changer-mot-de-passe";
  icone: typeof Store;
  titre: string;
  description: string;
  classes: string;
  enConstruction?: boolean;
}

const SECTIONS: SectionConfig[] = [
  {
    href: "/parametres/boutiques",
    icone: Store,
    titre: "Mes boutiques",
    description: "Gérez vos boutiques, basculez entre elles ou créez-en une nouvelle.",
    classes: "bg-accent/10 text-accent",
  },
  {
    href: "/parametres/equipe",
    icone: Users,
    titre: "Équipe",
    description: "Inviter des membres, attribuer rôles et accès aux points de vente.",
    classes: "bg-warning/10 text-warning",
  },
  {
    action: "changer-mot-de-passe",
    icone: ShieldCheck,
    titre: "Sécurité",
    description: "Changer votre mot de passe et protéger votre compte.",
    classes: "bg-primary-500/10 text-primary-500",
  },
  {
    href: "/parametres",
    icone: Building2,
    titre: "Profil de la boutique",
    description: "Nom, adresse, devise, secteur d'activité et types de produits autorisés.",
    classes: "bg-success/10 text-success",
    enConstruction: true,
  },
  {
    href: "/parametres",
    icone: Tag,
    titre: "Catégories",
    description: "Organisez votre catalogue par catégories et sous-catégories.",
    classes: "bg-muted/10 text-muted",
    enConstruction: true,
  },
];

export default function PageParametres() {
  const [modalMotDePasse, setModalMotDePasse] = useState(false);

  return (
    <>
      <Topbar titre="Paramètres" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECTIONS.map((s) => {
            const Icone = s.icone;
            const contenu = (
              <Card className="hover:border-accent/40 transition-colors h-full cursor-pointer">
                <Card.Content className="p-5 flex items-start gap-3">
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.classes}`}>
                    <Icone size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{s.titre}</p>
                      {s.enConstruction && (
                        <span className="text-[10px] text-muted bg-muted/10 px-1.5 py-0.5 rounded">
                          Bientôt
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-1">{s.description}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted shrink-0" />
                </Card.Content>
              </Card>
            );

            if (s.action === "changer-mot-de-passe") {
              return (
                <button
                  key={s.titre}
                  type="button"
                  onClick={() => setModalMotDePasse(true)}
                  className="block text-left w-full"
                >
                  {contenu}
                </button>
              );
            }
            return (
              <Link key={s.titre} href={s.href!} className="block">
                {contenu}
              </Link>
            );
          })}
        </div>
      </div>

      <ModalChangerMotDePasse
        ouvert={modalMotDePasse}
        onFermer={() => setModalMotDePasse(false)}
      />
    </>
  );
}
