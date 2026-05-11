"use client";

import { useEffect, useState } from "react";
import { Button, Card, Switch, Skeleton, toast } from "@heroui/react";
import { Save, Banknote, CreditCard, Smartphone, Building, Hourglass } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { useModifierBoutiqueMutation } from "@/features/boutique/queries/boutique.mutations";
import type { MethodePaiement } from "@/features/auth/types/auth.type";

interface OptionMethode {
  id: MethodePaiement;
  label: string;
  description: string;
  icone: typeof Banknote;
  classes: string;
}

const OPTIONS: OptionMethode[] = [
  {
    id: "CASH",
    label: "Espèces",
    description: "Paiement en liquide (toujours recommandé d'être activé).",
    icone: Banknote,
    classes: "bg-accent/10 text-accent",
  },
  {
    id: "MOBILE_MONEY",
    label: "Mobile Money",
    description: "Orange Money, MTN MoMo, Wave, Moov Money, etc.",
    icone: Smartphone,
    classes: "bg-success/10 text-success",
  },
  {
    id: "CARD",
    label: "Carte bancaire",
    description: "Paiement par TPE (Visa, Mastercard, GIM-UEMOA).",
    icone: CreditCard,
    classes: "bg-warning/10 text-warning",
  },
  {
    id: "BANK_TRANSFER",
    label: "Virement bancaire",
    description: "Pour les ventes B2B ou montants importants.",
    icone: Building,
    classes: "bg-muted/10 text-muted",
  },
  {
    id: "CREDIT",
    label: "À crédit",
    description: "Le client paye plus tard (ardoise). À utiliser avec parcimonie.",
    icone: Hourglass,
    classes: "bg-danger/10 text-danger",
  },
];

export default function PagePaiements() {
  const { data: boutique, isLoading } = useBoutiqueActiveQuery();
  const mutation = useModifierBoutiqueMutation();
  const [actives, setActives] = useState<Set<MethodePaiement>>(new Set());

  useEffect(() => {
    if (boutique) setActives(new Set(boutique.methodesPaiement ?? []));
  }, [boutique]);

  function toggle(id: MethodePaiement) {
    const next = new Set(actives);
    if (next.has(id)) {
      if (id === "CASH") {
        toast.warning("Les espèces ne peuvent pas être désactivées (méthode de secours).");
        return;
      }
      next.delete(id);
    } else {
      next.add(id);
    }
    setActives(next);
  }

  async function enregistrer() {
    if (!boutique) return;
    if (actives.size === 0) {
      toast.danger("Au moins une méthode doit rester activée.");
      return;
    }
    await mutation.mutateAsync({
      tenantId: boutique.id,
      data: { methodesPaiement: Array.from(actives) },
    });
  }

  return (
    <PageContainer>
      <PageHeader
        titre="Méthodes de paiement"
        description="Choisissez les méthodes que vos caissiers proposent à l'encaissement. Désactiver une méthode la cache du POS sans toucher à l'historique."
      />

      <Card>
        <Card.Content className="p-4 space-y-3">
          {isLoading || !boutique ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))
          ) : (
            OPTIONS.map((o) => {
              const Icone = o.icone;
              const actif = actives.has(o.id);
              return (
                <div
                  key={o.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    actif ? "border-border bg-surface" : "border-border/40 bg-surface-secondary/30"
                  }`}
                >
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${o.classes}`}>
                    <Icone size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{o.label}</p>
                    <p className="text-xs text-muted mt-0.5">{o.description}</p>
                  </div>
                  <Switch
                    isSelected={actif}
                    onChange={() => toggle(o.id)}
                    aria-label={`${actif ? "Désactiver" : "Activer"} ${o.label}`}
                  >
                    <Switch.Control><Switch.Thumb /></Switch.Control>
                  </Switch>
                </div>
              );
            })
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              className="gap-1.5"
              onPress={enregistrer}
              isDisabled={mutation.isPending || !boutique}
            >
              <Save size={16} />
              {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </Card.Content>
      </Card>
    </PageContainer>
  );
}
