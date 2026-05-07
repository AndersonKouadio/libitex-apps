"use client";

import { Card, Chip, Button } from "@heroui/react";
import { Store, Crown, Check, ArrowRight } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSwitcherBoutiqueMutation } from "../queries/boutique-switch.mutation";
import { SECTEUR_LABELS } from "@/features/auth/utils/secteur-activite";
import type { IBoutiqueResume, SecteurActivite } from "../types/boutique.type";

const ROLES_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Manager",
  COMMERCIAL: "Commercial",
  CASHIER: "Caissier",
  WAREHOUSE: "Magasinier",
  SUPER_ADMIN: "Super-admin",
};

interface Props {
  boutique: IBoutiqueResume;
}

export function CarteBoutique({ boutique }: Props) {
  const { boutiqueActive } = useAuth();
  const switcher = useSwitcherBoutiqueMutation();
  const estActive = boutiqueActive?.id === boutique.id;

  return (
    <Card className={estActive ? "border-accent ring-1 ring-accent/20" : ""}>
      <Card.Content className="p-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <Store size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground truncate">{boutique.nom}</h3>
              {boutique.isOwner && <Crown size={12} className="text-warning shrink-0" />}
              {estActive && (
                <Chip className="text-[10px] bg-accent/10 text-accent gap-0.5">
                  <Check size={10} />
                  Active
                </Chip>
              )}
            </div>
            <p className="text-xs text-muted mb-2">
              {SECTEUR_LABELS[boutique.secteurActivite as SecteurActivite]}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Chip className="text-[10px] bg-muted/10 text-muted">{ROLES_LABELS[boutique.role] ?? boutique.role}</Chip>
              <span className="text-[10px] font-mono text-muted">/{boutique.slug}</span>
              <span className="text-[10px] text-muted">{boutique.devise}</span>
            </div>
          </div>
        </div>

        {!estActive && (
          <Button
            variant="ghost"
            className="w-full justify-between mt-3 gap-1.5"
            onPress={() => switcher.mutate(boutique.id)}
            isDisabled={switcher.isPending}
          >
            <span className="text-sm">Basculer sur cette boutique</span>
            <ArrowRight size={14} />
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}
