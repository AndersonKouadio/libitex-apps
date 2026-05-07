"use client";

import Link from "next/link";
import { Card } from "@heroui/react";
import { Topbar } from "@/components/layout/topbar";
import { Store, Users, ChevronRight, Building2, Tag } from "lucide-react";

const SECTIONS = [
  {
    href: "/parametres/boutiques",
    icone: Store,
    titre: "Mes boutiques",
    description: "Gerez vos boutiques, basculez entre elles ou creez-en une nouvelle.",
    classes: "bg-accent/10 text-accent",
  },
  {
    href: "/parametres",
    icone: Users,
    titre: "Equipe",
    description: "Inviter des utilisateurs, attribuer roles et acces aux points de vente.",
    classes: "bg-warning/10 text-warning",
    enConstruction: true,
  },
  {
    href: "/parametres",
    icone: Building2,
    titre: "Profil de la boutique",
    description: "Nom, adresse, devise, secteur d'activite et types de produits autorises.",
    classes: "bg-success/10 text-success",
    enConstruction: true,
  },
  {
    href: "/parametres",
    icone: Tag,
    titre: "Categories",
    description: "Organisez votre catalogue par categories et sous-categories.",
    classes: "bg-muted/10 text-muted",
    enConstruction: true,
  },
];

export default function PageParametres() {
  return (
    <>
      <Topbar titre="Parametres" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECTIONS.map((s) => {
            const Icone = s.icone;
            return (
              <Link key={s.titre} href={s.href} className="block">
                <Card className="hover:border-accent/40 transition-colors h-full">
                  <Card.Content className="p-5 flex items-start gap-3">
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.classes}`}>
                      <Icone size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{s.titre}</p>
                        {s.enConstruction && (
                          <span className="text-[10px] text-muted bg-muted/10 px-1.5 py-0.5 rounded">
                            Bientot
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-1">{s.description}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted shrink-0" />
                  </Card.Content>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
