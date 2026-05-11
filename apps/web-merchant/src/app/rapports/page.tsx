"use client";

import { useMemo, useState } from "react";
import {
  Select, ListBox, Label, Button, Spinner, Tabs, Card,
} from "@heroui/react";
import {
  Printer, Download, BarChart3, FileText, TrendingUp, Calculator, ClipboardList,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ChampDate } from "@/components/forms/champ-date";
import { AucunEmplacement } from "@/components/empty-states/aucun-emplacement";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { ModalEmplacement } from "@/features/stock/components/modal-emplacement";
import { useRapportZQuery } from "@/features/vente/queries/rapport-z.query";
import {
  useRapportVentesPeriodeQuery, useRapportMargesQuery,
} from "@/features/vente/queries/rapports-periode.query";
import { RapportZResume } from "@/features/vente/components/rapport-z-resume";
import { RapportZVentilation } from "@/features/vente/components/rapport-z-ventilation";
import { RapportZTopProduits } from "@/features/vente/components/rapport-z-top-produits";
import { RapportZVentesHeure } from "@/features/vente/components/rapport-z-ventes-heure";
import { RapportVentesPeriode } from "@/features/vente/components/rapport-ventes-periode";
import { RapportMarges } from "@/features/vente/components/rapport-marges";
import {
  exporterRapportZCsv, exporterVentesPeriodeCsv, exporterMargesCsv,
} from "@/features/vente/utils/export-rapport";

type Onglet = "z-jour" | "ventes-periode" | "marges" | "tva";

function aujourdhui(): string {
  return new Date().toISOString().split("T")[0]!;
}

function ilYa(jours: number): string {
  const d = new Date();
  d.setDate(d.getDate() - jours);
  return d.toISOString().split("T")[0]!;
}

export default function PageRapports() {
  const { data: emplacements } = useEmplacementListQuery();
  const [empId, setEmpId] = useState("");
  const [date, setDate] = useState(aujourdhui());
  const [empConsulte, setEmpConsulte] = useState<string | undefined>();
  const [dateConsultee, setDateConsultee] = useState<string>(date);
  const [modalEmpOuvert, setModalEmpOuvert] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>("z-jour");

  // Période (pour onglets Ventes et Marges) — par défaut, 7 derniers jours
  const [debut, setDebut] = useState(ilYa(7));
  const [fin, setFin] = useState(aujourdhui());
  const [empPeriode, setEmpPeriode] = useState("");

  const { data: rapport, isFetching } = useRapportZQuery(empConsulte, dateConsultee);
  const { data: rapportVentes, isFetching: ventesChargement } = useRapportVentesPeriodeQuery(
    debut, fin, empPeriode || undefined, onglet === "ventes-periode",
  );
  const { data: rapportMarges, isFetching: margesChargement } = useRapportMargesQuery(
    debut, fin, empPeriode || undefined, onglet === "marges",
  );

  const empParDefaut = empId || emplacements?.[0]?.id || "";
  const aucunEmplacement = emplacements !== undefined && emplacements.length === 0;
  const nomEmplacement = useMemo(
    () => (emplacements ?? []).find((e) => e.id === empConsulte)?.nom ?? "",
    [emplacements, empConsulte],
  );
  const nomEmpPeriode = useMemo(
    () => (emplacements ?? []).find((e) => e.id === empPeriode)?.nom,
    [emplacements, empPeriode],
  );

  function generer() {
    if (!empParDefaut) return;
    setEmpConsulte(empParDefaut);
    setDateConsultee(date);
  }

  if (aucunEmplacement) {
    return (
      <PageContainer>
        <AucunEmplacement onCreer={() => setModalEmpOuvert(true)} contexte="rapports" />
        <ModalEmplacement ouvert={modalEmpOuvert} onFermer={() => setModalEmpOuvert(false)} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titre="Rapports"
        description="Synthèse de votre activité : Z journalier, ventes sur période, marges, TVA."
      />

      <Tabs selectedKey={onglet} onSelectionChange={(k) => setOnglet(k as Onglet)} aria-label="Type de rapport">
        <Tabs.List>
          <Tabs.Tab id="z-jour" className="px-4 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5">
              <FileText size={14} />
              Z journalier
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="ventes-periode" className="px-4 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp size={14} />
              Ventes par période
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="marges" className="px-4 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5">
              <Calculator size={14} />
              Marges
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="tva" isDisabled className="px-4 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5">
              <ClipboardList size={14} />
              TVA
            </span>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {onglet === "z-jour" && (
        <div className="mt-4 space-y-4 rapport-z-print">
          <Card className="no-print">
            <Card.Content className="flex flex-wrap items-end gap-3 p-4">
              <Select
                selectedKey={empParDefaut}
                onSelectionChange={(key) => setEmpId(String(key))}
                aria-label="Emplacement"
                className="min-w-[200px]"
              >
                <Label>Emplacement</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {(emplacements ?? []).map((e) => (
                      <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>{e.nom}</ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <ChampDate label="Date" value={date} onChange={setDate} />
              <Button variant="primary" onPress={generer} isDisabled={isFetching || !empParDefaut}>
                {isFetching ? <Spinner size="sm" /> : <><BarChart3 size={14} className="mr-1.5" />Générer le Z</>}
              </Button>
              {rapport && (
                <>
                  <Button
                    variant="secondary"
                    onPress={() => exporterRapportZCsv(rapport, nomEmplacement)}
                    className="gap-1.5"
                  >
                    <Download size={14} /> Export CSV
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => window.print()}
                    className="gap-1.5"
                  >
                    <Printer size={14} /> Imprimer / PDF
                  </Button>
                </>
              )}
            </Card.Content>
          </Card>

          {rapport && (
            <>
              <div className="print-header hidden">
                <h2>Rapport Z — {nomEmplacement}</h2>
                <p>Date : {new Date(rapport.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <RapportZResume rapport={rapport} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RapportZVentilation rapport={rapport} />
                <RapportZTopProduits rapport={rapport} />
              </div>
              <RapportZVentesHeure rapport={rapport} />
            </>
          )}

          {!rapport && !isFetching && (
            <Card>
              <Card.Content className="py-16 text-center">
                <FileText size={28} className="text-muted/30 mx-auto mb-3" />
                <p className="text-sm text-foreground">Sélectionnez un emplacement et une date</p>
                <p className="text-xs text-muted mt-1">pour générer le Z de caisse</p>
              </Card.Content>
            </Card>
          )}
        </div>
      )}

      {(onglet === "ventes-periode" || onglet === "marges") && (
        <div className="mt-4 space-y-4">
          <Card>
            <Card.Content className="flex flex-wrap items-end gap-3 p-4">
              <ChampDate label="Du" value={debut} onChange={setDebut} />
              <ChampDate label="Au" value={fin} onChange={setFin} />
              <Select
                selectedKey={empPeriode || "all"}
                onSelectionChange={(k) => setEmpPeriode(k === "all" ? "" : String(k))}
                aria-label="Emplacement"
                className="min-w-[200px]"
              >
                <Label>Emplacement</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="all" textValue="Tous les emplacements">Tous</ListBox.Item>
                    {(emplacements ?? []).map((e) => (
                      <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>{e.nom}</ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              {onglet === "ventes-periode" && rapportVentes && rapportVentes.jours.length > 0 && (
                <Button
                  variant="secondary"
                  onPress={() => exporterVentesPeriodeCsv(rapportVentes, nomEmpPeriode)}
                  className="gap-1.5"
                >
                  <Download size={14} /> Export CSV
                </Button>
              )}
              {onglet === "marges" && rapportMarges && rapportMarges.lignes.length > 0 && (
                <Button
                  variant="secondary"
                  onPress={() => exporterMargesCsv(rapportMarges, nomEmpPeriode)}
                  className="gap-1.5"
                >
                  <Download size={14} /> Export CSV
                </Button>
              )}
            </Card.Content>
          </Card>

          {onglet === "ventes-periode" && (
            ventesChargement ? (
              <Card><Card.Content className="py-10 text-center"><Spinner size="sm" /></Card.Content></Card>
            ) : rapportVentes ? (
              <RapportVentesPeriode rapport={rapportVentes} />
            ) : null
          )}

          {onglet === "marges" && (
            margesChargement ? (
              <Card><Card.Content className="py-10 text-center"><Spinner size="sm" /></Card.Content></Card>
            ) : rapportMarges ? (
              <RapportMarges rapport={rapportMarges} />
            ) : null
          )}
        </div>
      )}

      {onglet === "tva" && (
        <Card className="mt-4">
          <Card.Content className="py-16 text-center">
            <p className="text-sm text-foreground">Bientôt disponible</p>
            <p className="text-xs text-muted mt-1">
              Le rapport TVA détaillé sera ajouté dans le prochain commit.
            </p>
          </Card.Content>
        </Card>
      )}
    </PageContainer>
  );
}
