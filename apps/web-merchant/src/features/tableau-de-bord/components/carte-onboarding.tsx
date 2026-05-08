"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button } from "@heroui/react";
import { Check, X, ArrowRight, Sparkles } from "lucide-react";
import { useEquipeListQuery } from "@/features/equipe/queries/equipe.query";
import { useTicketListQuery } from "@/features/vente/queries/ticket-list.query";

interface Props {
  nombreProduits: number;
  nombreEmplacements: number;
  nomBoutique?: string;
}

interface Etape {
  fait: boolean;
  titre: string;
  description: string;
  href: string;
  cta: string;
}

const STORAGE_KEY = "libitex.onboarding.dismissed";

export function CarteOnboarding({ nombreProduits, nombreEmplacements, nomBoutique }: Props) {
  const [dismissed, setDismissed] = useState(true);
  const { data: equipe } = useEquipeListQuery();
  const { data: tickets } = useTicketListQuery({ statut: "COMPLETED", page: 1 });

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const aFaitVente = (tickets?.data?.length ?? 0) > 0;
  const aEquipe = (equipe?.length ?? 0) > 1;

  const etapes: Etape[] = [
    {
      fait: nombreEmplacements > 0,
      titre: "Configurer un emplacement",
      description: "Le point de vente où vous comptez votre stock et encaissez.",
      href: "/stock",
      cta: "Voir les emplacements",
    },
    {
      fait: nombreProduits > 0,
      titre: "Ajouter votre premier produit",
      description: "Créez un produit, définissez son prix et son unité de vente.",
      href: "/catalogue",
      cta: "Aller au catalogue",
    },
    {
      fait: aFaitVente,
      titre: "Réaliser une première vente",
      description: "Ouvrez la caisse, scannez ou cliquez sur un article puis encaissez.",
      href: "/pos",
      cta: "Ouvrir la caisse",
    },
    {
      fait: aEquipe,
      titre: "Inviter votre équipe",
      description: "Invitez vendeurs et gestionnaires avec leurs propres accès.",
      href: "/parametres/equipe",
      cta: "Inviter un membre",
    },
  ];

  const faits = etapes.filter((e) => e.fait).length;
  const total = etapes.length;
  const tout = faits === total;

  if (dismissed || tout) return null;

  function masquer() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  return (
    <Card className="mb-6 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
      <Card.Content className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">
                Bienvenue{nomBoutique ? `, ${nomBoutique}` : ""}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {faits} sur {total} étape{total > 1 ? "s" : ""} complétée{faits > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="text-muted hover:text-foreground p-1.5 h-auto min-w-0"
            onPress={masquer}
            aria-label="Masquer le démarrage rapide"
          >
            <X size={14} />
          </Button>
        </div>

        <div className="h-1 rounded-full bg-foreground/5 mb-4 overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${(faits / total) * 100}%` }}
          />
        </div>

        <ul className="space-y-2.5">
          {etapes.map((e, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  e.fait
                    ? "bg-success text-success-foreground"
                    : "border-2 border-foreground/15"
                }`}
              >
                {e.fait && <Check size={12} strokeWidth={3} />}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    e.fait ? "text-muted line-through" : "text-foreground"
                  }`}
                >
                  {e.titre}
                </p>
                {!e.fait && (
                  <>
                    <p className="text-xs text-muted mt-0.5">{e.description}</p>
                    <Link
                      href={e.href}
                      className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-accent hover:underline"
                    >
                      {e.cta}
                      <ArrowRight size={11} />
                    </Link>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card.Content>
    </Card>
  );
}
