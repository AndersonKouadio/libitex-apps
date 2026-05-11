"use client";

import { useMemo, useState } from "react";
import { Button, Card, toast } from "@heroui/react";
import { ArrowLeft, Upload, ChevronRight, CheckCircle2 } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  parserCsv, autoMapper, ligneVersProduit,
  type CsvParsed, type ChampProduit,
} from "@/lib/csv";
import { creerProduitSchema } from "@/features/catalogue/schemas/produit.schema";
import { useImporterProduitsMutation } from "@/features/catalogue/queries/produit-import.mutation";
import { ZoneUploadCsv } from "@/features/catalogue/components/import/zone-upload-csv";
import { EtapeMapping } from "@/features/catalogue/components/import/etape-mapping";
import { EtapeValidation, type LigneValidee } from "@/features/catalogue/components/import/etape-validation";

type Etape = "upload" | "mapping" | "validation";

const TITRES_ETAPE: Record<Etape, { num: number; titre: string; description: string }> = {
  upload:     { num: 1, titre: "1. Téléverser le fichier", description: "Sélectionnez un CSV exporté de votre Excel ou de votre ancien outil." },
  mapping:    { num: 2, titre: "2. Associer les colonnes", description: "Vérifiez que chaque champ produit pointe sur la bonne colonne CSV." },
  validation: { num: 3, titre: "3. Vérifier puis importer", description: "Aperçu des lignes valides et des erreurs avant la création." },
};

export default function PageImportProduits() {
  const [etape, setEtape] = useState<Etape>("upload");
  const [csv, setCsv] = useState<CsvParsed | null>(null);
  const [nomFichier, setNomFichier] = useState("");
  const [mapping, setMapping] = useState<Record<ChampProduit, number | null> | null>(null);
  const mutation = useImporterProduitsMutation();

  const lignesValidees: LigneValidee[] = useMemo(() => {
    if (!csv || !mapping) return [];
    return csv.lignes.map((l, index) => {
      const produit = ligneVersProduit(l, mapping);
      const result = creerProduitSchema.safeParse(produit);
      const erreurs = result.success ? [] : result.error.issues.map((i) => i.message);
      return { index, produit, erreurs };
    });
  }, [csv, mapping]);

  const valides = lignesValidees.filter((l) => l.erreurs.length === 0);
  const champsObligatoiresOK = mapping
    && mapping.nom !== null
    && mapping.sku !== null
    && mapping.prixDetail !== null;

  function quandCsvCharge(c: CsvParsed, nom: string) {
    setCsv(c);
    setNomFichier(nom);
    setMapping(autoMapper(c.headers));
    setEtape("mapping");
  }

  async function lancerImport() {
    if (valides.length === 0) return;
    try {
      const res = await mutation.mutateAsync(valides.map((l) => l.produit));
      if (res.erreurs.length === 0) {
        toast.success(`${res.succes} produit${res.succes > 1 ? "s" : ""} importé${res.succes > 1 ? "s" : ""}`);
      } else {
        toast.warning(`${res.succes}/${res.total} importés — ${res.erreurs.length} en erreur`);
      }
      window.location.href = "/catalogue";
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Erreur lors de l'import");
    }
  }

  const meta = TITRES_ETAPE[etape];

  return (
    <PageContainer>
      <PageHeader
        titre="Importer des produits depuis un CSV"
        description={meta.description}
        actions={
          <Button variant="ghost" className="gap-1.5" onPress={() => { window.location.href = "/catalogue"; }}>
            <ArrowLeft size={16} />
            Retour au catalogue
          </Button>
        }
      />

      <div className="flex items-center gap-2 mb-5 text-xs">
        {(["upload", "mapping", "validation"] as Etape[]).map((e, i, arr) => {
          const courant = e === etape;
          const passe = TITRES_ETAPE[e].num < meta.num;
          return (
            <div key={e} className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold ${
                  courant ? "bg-accent text-accent-foreground"
                    : passe ? "bg-success/15 text-success"
                    : "bg-surface-secondary text-muted"
                }`}
              >
                {passe ? <CheckCircle2 size={12} /> : TITRES_ETAPE[e].num}
              </span>
              <span className={courant ? "font-medium text-foreground" : "text-muted"}>
                {TITRES_ETAPE[e].titre.replace(/^\d+\.\s/, "")}
              </span>
              {i < arr.length - 1 && <ChevronRight size={12} className="text-muted/50 mx-1" />}
            </div>
          );
        })}
      </div>

      <Card>
        <Card.Content className="p-6">
          {etape === "upload" && <ZoneUploadCsv onCsv={quandCsvCharge} />}

          {etape === "mapping" && csv && mapping && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Fichier <span className="font-mono text-foreground">{nomFichier}</span> — {csv.lignes.length} ligne{csv.lignes.length > 1 ? "s" : ""}.
              </p>
              <EtapeMapping headers={csv.headers} mapping={mapping} onMapping={setMapping} />
              <div className="flex justify-between pt-3 border-t border-border">
                <Button variant="ghost" onPress={() => setEtape("upload")}>Changer de fichier</Button>
                <Button
                  variant="primary"
                  className="gap-1.5"
                  onPress={() => setEtape("validation")}
                  isDisabled={!champsObligatoiresOK}
                >
                  Vérifier les lignes
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}

          {etape === "validation" && (
            <div className="space-y-4">
              <EtapeValidation lignes={lignesValidees} />
              <div className="flex justify-between pt-3 border-t border-border">
                <Button variant="ghost" onPress={() => setEtape("mapping")}>Modifier le mapping</Button>
                <Button
                  variant="primary"
                  className="gap-1.5"
                  onPress={lancerImport}
                  isDisabled={valides.length === 0 || mutation.isPending}
                >
                  <Upload size={14} />
                  {mutation.isPending
                    ? "Import en cours..."
                    : `Importer ${valides.length} produit${valides.length > 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          )}
        </Card.Content>
      </Card>
    </PageContainer>
  );
}
