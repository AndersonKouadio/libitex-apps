"use client";

import Link from "next/link";
import { Card } from "@heroui/react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Store, Users, ChevronRight, Building2, User, MapPin, Wallet, Printer, Sparkles, Tag, MessageCircle, Shield } from "lucide-react";

interface SectionConfig {
  href: string;
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
    href: "/parametres/paiements",
    icone: Wallet,
    titre: "Méthodes de paiement",
    description: "Activer / désactiver les méthodes proposées à l'encaissement (Espèces, Mobile Money, Carte...).",
    classes: "bg-success/10 text-success",
  },
  {
    href: "/parametres/imprimante",
    icone: Printer,
    titre: "Imprimante de tickets",
    description: "Connecter une imprimante thermique 80mm (USB) pour impression directe sans dialog.",
    classes: "bg-accent/10 text-accent",
  },
  {
    href: "/parametres/fidelite",
    icone: Sparkles,
    titre: "Programme fidelite",
    description: "Recompensez vos clients reguliers en points sur leurs achats — ratio configurable.",
    classes: "bg-warning/10 text-warning",
  },
  {
    href: "/parametres/promotions",
    icone: Tag,
    titre: "Codes promo",
    description: "Codes de reduction (% ou montant fixe) actifs sur une plage de dates ou un nombre d'usages.",
    classes: "bg-danger/10 text-danger",
  },
  {
    href: "/parametres/notifications",
    icone: MessageCircle,
    titre: "Notifications WhatsApp",
    description: "Suivi des envois (ticket, reservation, fournisseur) et etat de la connexion Meta.",
    classes: "bg-success/10 text-success",
  },
  {
    href: "/parametres/mon-compte",
    icone: User,
    titre: "Mon compte",
    description: "Vos informations personnelles, mot de passe et suppression définitive du compte.",
    classes: "bg-secondary/10 text-secondary",
  },
  {
    href: "/parametres/securite",
    icone: Shield,
    titre: "Sécurité (MFA)",
    description: "Active la double authentification (Google Authenticator, Authy) sur ton compte.",
    classes: "bg-danger/10 text-danger",
  },
];

export default function PageParametres() {
  return (
    <PageContainer>
      <PageHeader
        titre="Configuration"
        description="Gérez vos boutiques, vos emplacements, votre équipe et votre compte."
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
                      <p className="text-xs text-muted mt-1">{s.description}</p>
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
