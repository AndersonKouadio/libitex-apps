"use client";

import { useEffect, useState } from "react";
import {
  Button, Card, Switch, TextField, Label, Input, FieldError, Skeleton,
} from "@heroui/react";
import { Sparkles, Save } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  useConfigFideliteQuery, useModifierConfigFideliteMutation,
} from "@/features/fidelite/queries/fidelite.query";
import { formatMontant } from "@/features/vente/utils/format";

export default function PageFidelite() {
  const { data: config, isLoading } = useConfigFideliteQuery();
  const modifier = useModifierConfigFideliteMutation();
  const [etat, setEtat] = useState({
    actif: false,
    nomProgramme: "",
    ratioGain: "100",
    valeurPoint: "5",
    seuilUtilisation: "100",
  });

  useEffect(() => {
    if (!config) return;
    setEtat({
      actif: config.actif,
      nomProgramme: config.nomProgramme,
      ratioGain: String(config.ratioGain),
      valeurPoint: String(config.valeurPoint),
      seuilUtilisation: String(config.seuilUtilisation),
    });
  }, [config]);

  async function valider() {
    await modifier.mutateAsync({
      actif: etat.actif,
      nomProgramme: etat.nomProgramme,
      ratioGain: Number(etat.ratioGain),
      valeurPoint: Number(etat.valeurPoint),
      seuilUtilisation: Number(etat.seuilUtilisation),
    });
  }

  // Apercu : pour une vente de 10 000 F, le client gagne X points = Y F
  const ventes = 10000;
  const pointsGagnes = Number(etat.ratioGain) > 0
    ? Math.floor(ventes / Number(etat.ratioGain))
    : 0;
  const valeurGagnee = pointsGagnes * Number(etat.valeurPoint || 0);

  return (
    <PageContainer>
      <PageHeader
        titre="Programme fidelite"
        description="Recompensez vos clients reguliers — gagner et utiliser des points sur les achats."
      />

      {isLoading ? (
        <Skeleton className="h-64 rounded" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <Card.Content className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Programme actif</p>
                    <p className="text-xs text-muted mt-0.5">
                      Quand actif, chaque ticket avec un client lie credite automatiquement
                      des points proportionnels au total.
                    </p>
                  </div>
                </div>
                <Switch
                  isSelected={etat.actif}
                  onChange={() => setEtat((e) => ({ ...e, actif: !e.actif }))}
                  aria-label="Activer le programme"
                >
                  <Switch.Control><Switch.Thumb /></Switch.Control>
                </Switch>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <TextField value={etat.nomProgramme} onChange={(v) => setEtat((e) => ({ ...e, nomProgramme: v }))}>
                  <Label>Nom du programme</Label>
                  <Input placeholder="Carte LIBITEX" />
                  <FieldError />
                </TextField>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <TextField value={etat.ratioGain} onChange={(v) => setEtat((e) => ({ ...e, ratioGain: v }))}>
                    <Label>Ratio de gain (F par point)</Label>
                    <Input type="number" inputMode="numeric" min="1" />
                    <FieldError />
                  </TextField>
                  <TextField value={etat.valeurPoint} onChange={(v) => setEtat((e) => ({ ...e, valeurPoint: v }))}>
                    <Label>Valeur d&apos;1 point (F)</Label>
                    <Input type="number" inputMode="numeric" min="0" step="0.5" />
                    <FieldError />
                  </TextField>
                  <TextField value={etat.seuilUtilisation} onChange={(v) => setEtat((e) => ({ ...e, seuilUtilisation: v }))}>
                    <Label>Seuil minimum (points)</Label>
                    <Input type="number" inputMode="numeric" min="0" />
                    <FieldError />
                  </TextField>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="primary" className="gap-2" onPress={valider} isDisabled={modifier.isPending}>
                  <Save size={14} />
                  {modifier.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="p-5">
              <p className="text-sm font-semibold mb-3">Apercu</p>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-surface-secondary rounded-lg">
                  <p className="text-xs text-muted">Pour un ticket de</p>
                  <p className="font-bold tabular-nums">{formatMontant(ventes)} F</p>
                </div>
                <div className="text-xs text-muted">Le client gagne</div>
                <div className="p-3 bg-warning/10 text-warning rounded-lg">
                  <p className="font-bold text-2xl tabular-nums">{pointsGagnes}</p>
                  <p className="text-xs mt-0.5">point{pointsGagnes > 1 ? "s" : ""}</p>
                </div>
                <div className="text-xs text-muted">Valeur des points</div>
                <p className="font-semibold tabular-nums">{formatMontant(valeurGagnee)} F</p>
                <p className="text-[10px] text-muted leading-relaxed mt-2">
                  Le client gagne des points a chaque ticket et peut les utiliser au paiement
                  d&apos;un prochain achat (a partir du seuil minimum configure ci-dessus).
                </p>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
