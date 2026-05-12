"use client";

import Link from "next/link";
import { Card } from "@heroui/react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Building2, ClipboardList, ChevronRight } from "lucide-react";

const SECTIONS = [
  {
    href: "/achats/fournisseurs",
    icone: Building2,
    titre: "Fournisseurs",
    description: "Repertoire des fournisseurs, conditions de paiement et contacts.",
    classes: "bg-accent/10 text-accent",
  },
  {
    href: "/achats/commandes",
    icone: ClipboardList,
    titre: "Bons de commande",
    description: "Creer, suivre, receptionner les commandes — les receptions alimentent automatiquement le stock.",
    classes: "bg-success/10 text-success",
  },
];

export default function PageAchats() {
  return (
    <PageContainer>
      <PageHeader
        titre="Achats"
        description="Gerez vos fournisseurs et les bons de commande de reapprovisionnement."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECTIONS.map((s) => {
          const Icone = s.icone;
          return (
            <Link key={s.titre} href={s.href} className="block">
              <Card className="hover:border-accent/40 transition-colors h-full cursor-pointer">
                <Card.Content className="p-5">
                  <div className="flex items-start gap-3">
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.classes}`}>
                      <Icone size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{s.titre}</p>
                      <p className="text-xs text-muted mt-1 leading-relaxed">{s.description}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted shrink-0 mt-2" />
                  </div>
                </Card.Content>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}
