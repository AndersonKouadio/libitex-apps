"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@heroui/react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Store, Users, ChevronRight, ShieldCheck, Building2, User, MapPin } from "lucide-react";
import { ModalChangerMotDePasse } from "@/features/auth/components/modal-changer-mot-de-passe";

interface SectionConfig {
  href?: string;
  action?: "changer-mot-de-passe";
  icone: typeof Store;
  titre: string;
  description: string;
  classes: string;
}

const SECTIONS: SectionConfig[] = [
  {
    href: "/parametres/boutiques",
    icone: Store,
    titre: "Mes boutiques",
    description: "Liste des boutiques, bascule entre elles, création et suppression.",
    classes: "bg-accent/10 text-accent",
  },
  {
    href: "/parametres/profil",
    icone: Building2,
    titre: "Profil de la boutique",
    description: "Nom, secteur d'activité, devise, contact et adresse de la boutique active.",
    classes: "bg-success/10 text-success",
  },
  {
    href: "/parametres/emplacements",
    icone: MapPin,
    titre: "Emplacements",
    description: "Boutiques, entrepôts, camions ou stands où vous gérez du stock.",
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
    href: "/parametres/mon-compte",
    icone: User,
    titre: "Mon compte",
    description: "Vos informations personnelles et la suppression définitive du compte.",
    classes: "bg-secondary/10 text-secondary",
  },
  {
    action: "changer-mot-de-passe",
    icone: ShieldCheck,
    titre: "Sécurité",
    description: "Changer votre mot de passe et protéger votre compte.",
    classes: "bg-primary-500/10 text-primary-500",
  },
];

export default function PageParametres() {
  const [modalMotDePasse, setModalMotDePasse] = useState(false);

  return (
    <PageContainer>
      <PageHeader
        titre="Configuration"
        description="Gérez vos boutiques, votre équipe, votre profil et la sécurité de votre compte."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECTIONS.map((s) => {
            const Icone = s.icone;
            const contenu = (
              <Card className="hover:border-accent/40 transition-colors h-full cursor-pointer">
                <Card.Content className="p-5">
                  <div className="flex items-start gap-3">
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.classes}`}>
                      <Icone size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{s.titre}</p>
                      <p className="text-xs text-muted mt-1">{s.description}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted shrink-0 mt-2" />
                  </div>
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

      <ModalChangerMotDePasse
        ouvert={modalMotDePasse}
        onFermer={() => setModalMotDePasse(false)}
      />
    </PageContainer>
  );
}
