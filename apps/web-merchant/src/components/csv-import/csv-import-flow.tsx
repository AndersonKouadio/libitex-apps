"use client";

import { useMemo, useRef, useState } from "react";
import { Button, Card, Select, ListBox, Label, toast } from "@heroui/react";
import { ArrowLeft, Upload, ChevronRight, CheckCircle2, FileText, AlertTriangle } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  parserCsv, autoMapperGeneric, ligneVersObjet,
  type CsvParsed, type ChampDef,
} from "@/lib/csv";

type Etape = "upload" | "mapping" | "validation";

interface LigneValidee {
  index: number;
  donnees: Record<string, string | undefined>;
  erreurs: string[];
}

interface Props {
  /** Titre de la page (ex: "Importer des clients depuis un CSV"). */
  titre: string;
  /** Champs supportes (cle, libelle, synonymes, obligatoire). */
  champs: ChampDef[];
  /** Validation par ligne (lance des erreurs string[] si invalide). */
  validerLigne: (donnees: Record<string, string | undefined>) => string[];
  /** Lance l'import sur le backend, retourne le resume. */
  onImport: (items: Record<string, string | undefined>[]) => Promise<{
    total: number; succes: number; erreurs: { ligne: number; message: string }[];
  }>;
  /** URL de retour apres import (liste). */
  urlRetour: string;
  /** Libelle du retour (ex: "Retour aux clients"). */
  libelleRetour: string;
  /** Exemple CSV affiche dans l'upload (multilignes). */
  exempleCsv: string;
  /** Description courte affichee sous le titre. */
  descriptionUpload: string;
}

const TITRES_ETAPE: Record<Etape, { num: number; titre: string }> = {
  upload:     { num: 1, titre: "Téléverser le fichier" },
  mapping:    { num: 2, titre: "Associer les colonnes" },
  validation: { num: 3, titre: "Vérifier puis importer" },
};

export function CsvImportFlow({
  titre, champs, validerLigne, onImport,
  urlRetour, libelleRetour, exempleCsv, descriptionUpload,
}: Props) {
  const [etape, setEtape] = useState<Etape>("upload");
  const [csv, setCsv] = useState<CsvParsed | null>(null);
  const [nomFichier, setNomFichier] = useState("");
  const [mapping, setMapping] = useState<Record<string, number | null> | null>(null);
  const [enCours, setEnCours] = useState(false);

  const lignesValidees: LigneValidee[] = useMemo(() => {
    if (!csv || !mapping) return [];
    return csv.lignes.map((l, index) => {
      const donnees = ligneVersObjet(l, mapping);
      const erreurs = validerLigne(donnees);
      return { index, donnees, erreurs };
    });
  }, [csv, mapping, validerLigne]);

  const valides = lignesValidees.filter((l) => l.erreurs.length === 0);
  const invalides = lignesValidees.filter((l) => l.erreurs.length > 0);
  const champsObligatoiresOk = mapping
    && champs.filter((c) => c.obligatoire).every((c) => mapping[c.cle] !== null);

  function quandCsvCharge(c: CsvParsed, nom: string) {
    setCsv(c);
    setNomFichier(nom);
    setMapping(autoMapperGeneric(c.headers, champs));
    setEtape("mapping");
  }

  async function lancerImport() {
    if (valides.length === 0) return;
    setEnCours(true);
    try {
      const res = await onImport(valides.map((l) => l.donnees));
      if (res.erreurs.length === 0) {
        toast.success(`${res.succes} ligne${res.succes > 1 ? "s" : ""} importée${res.succes > 1 ? "s" : ""}`);
      } else {
        toast.warning(`${res.succes}/${res.total} importées — ${res.erreurs.length} en erreur`);
      }
      window.location.href = urlRetour;
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setEnCours(false);
    }
  }

  const meta = TITRES_ETAPE[etape];

  return (
    <PageContainer>
      <PageHeader
        titre={titre}
        description={etape === "upload" ? descriptionUpload : etape === "mapping" ? "Vérifiez que chaque champ pointe sur la bonne colonne." : "Aperçu des lignes valides et des erreurs avant la création."}
        actions={
          <Button variant="ghost" className="gap-1.5" onPress={() => { window.location.href = urlRetour; }}>
            <ArrowLeft size={16} />
            {libelleRetour}
          </Button>
        }
      />

      <div className="flex items-center gap-2 mb-5 text-xs flex-wrap">
        {(["upload", "mapping", "validation"] as Etape[]).map((e, i, arr) => {
          const courant = e === etape;
          const passe = TITRES_ETAPE[e].num < meta.num;
          return (
            <div key={e} className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold ${
                  courant ? "bg-accent text-accent-foreground"
                    : passe ? "bg-success/15 text-success"
                    : "bg-muted/10 text-muted"
                }`}
              >
                {passe ? <CheckCircle2 size={12} /> : TITRES_ETAPE[e].num}
              </span>
              <span className={courant ? "font-medium text-foreground" : "text-muted"}>
                {TITRES_ETAPE[e].titre}
              </span>
              {i < arr.length - 1 && <ChevronRight size={12} className="text-muted/50 mx-1" />}
            </div>
          );
        })}
      </div>

      <Card>
        <Card.Content className="p-6">
          {etape === "upload" && (
            <ZoneUpload onCsv={quandCsvCharge} exempleCsv={exempleCsv} champs={champs} />
          )}

          {etape === "mapping" && csv && mapping && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Fichier <span className="font-mono text-foreground">{nomFichier}</span> — {csv.lignes.length} ligne{csv.lignes.length > 1 ? "s" : ""}.
              </p>
              <Mapping headers={csv.headers} mapping={mapping} onMapping={setMapping} champs={champs} />
              <div className="flex justify-between pt-3 border-t border-border">
                <Button variant="ghost" onPress={() => setEtape("upload")}>Changer de fichier</Button>
                <Button
                  variant="primary"
                  className="gap-1.5"
                  onPress={() => setEtape("validation")}
                  isDisabled={!champsObligatoiresOk}
                >
                  Vérifier les lignes
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}

          {etape === "validation" && (
            <div className="space-y-4">
              <Validation lignes={lignesValidees} valides={valides.length} invalides={invalides.length} champs={champs} />
              <div className="flex justify-between pt-3 border-t border-border">
                <Button variant="ghost" onPress={() => setEtape("mapping")}>Modifier le mapping</Button>
                <Button
                  variant="primary"
                  className="gap-1.5"
                  onPress={lancerImport}
                  isDisabled={valides.length === 0 || enCours}
                >
                  <Upload size={14} />
                  {enCours
                    ? "Import en cours..."
                    : `Importer ${valides.length} ligne${valides.length > 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          )}
        </Card.Content>
      </Card>
    </PageContainer>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────

function ZoneUpload({
  onCsv, exempleCsv, champs,
}: { onCsv: (csv: CsvParsed, nom: string) => void; exempleCsv: string; champs: ChampDef[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);
  const [erreur, setErreur] = useState("");

  async function traiterFichier(fichier: File) {
    setErreur("");
    if (!fichier.name.toLowerCase().endsWith(".csv")) {
      setErreur("Le fichier doit avoir l'extension .csv");
      return;
    }
    if (fichier.size > 2 * 1024 * 1024) {
      setErreur("Le fichier dépasse 2 Mo. Découpez-le en plusieurs lots.");
      return;
    }
    const texte = await fichier.text();
    const csv = parserCsv(texte);
    if (csv.headers.length === 0 || csv.lignes.length === 0) {
      setErreur("Le fichier est vide ou ne contient qu'un en-tête.");
      return;
    }
    onCsv(csv, fichier.name);
  }

  const headersReconnus = champs.map((c) => c.cle).join(", ");

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          const f = e.dataTransfer.files[0];
          if (f) traiterFichier(f);
        }}
        className={`rounded-xl border-2 border-dashed cursor-pointer p-12 text-center transition-colors ${
          survol ? "border-accent bg-accent/5" : "border-border bg-muted/5 hover:bg-muted/10"
        }`}
      >
        <Upload size={28} className="text-muted mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">
          Glissez votre fichier CSV ici, ou cliquez pour le sélectionner
        </p>
        <p className="text-xs text-muted mt-1">
          Headers reconnus : {headersReconnus}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) traiterFichier(f);
            e.target.value = "";
          }}
        />
      </div>

      {erreur && (
        <p className="mt-3 px-3 py-2 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</p>
      )}

      <div className="mt-4 rounded-lg bg-muted/5 p-3 flex items-start gap-2">
        <FileText size={14} className="text-muted shrink-0 mt-0.5" />
        <div className="text-xs text-muted">
          <p className="font-medium text-foreground">Modèle minimum :</p>
          <pre className="mt-1 text-[11px] font-mono whitespace-pre-wrap">{exempleCsv}</pre>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="primary" className="gap-1.5" onPress={() => inputRef.current?.click()}>
          <Upload size={14} />
          Sélectionner un fichier
        </Button>
      </div>
    </div>
  );
}

function Mapping({
  headers, mapping, onMapping, champs,
}: {
  headers: string[];
  mapping: Record<string, number | null>;
  onMapping: (m: Record<string, number | null>) => void;
  champs: ChampDef[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {champs.map((champ) => {
        const valeur = mapping[champ.cle];
        return (
          <Select
            key={champ.cle}
            selectedKey={valeur === null || valeur === undefined ? "none" : String(valeur)}
            onSelectionChange={(k) => {
              const next = { ...mapping };
              next[champ.cle] = k === "none" ? null : Number(k);
              onMapping(next);
            }}
            aria-label={champ.libelle}
          >
            <Label>
              {champ.libelle}
              {champ.obligatoire && <span className="text-danger ml-1">*</span>}
            </Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="none" textValue="— Ignorer —">— Ignorer —</ListBox.Item>
                {headers.map((h, i) => (
                  <ListBox.Item key={i} id={String(i)} textValue={h}>{h}</ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        );
      })}
    </div>
  );
}

function Validation({
  lignes, valides, invalides, champs,
}: {
  lignes: LigneValidee[];
  valides: number;
  invalides: number;
  champs: ChampDef[];
}) {
  const apercu = lignes.slice(0, 50);
  const champsAffiches = champs.slice(0, 4);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-success">
          <CheckCircle2 size={14} />
          <span className="tabular-nums font-semibold">{valides}</span> valide{valides > 1 ? "s" : ""}
        </span>
        {invalides > 0 && (
          <span className="flex items-center gap-1.5 text-danger">
            <AlertTriangle size={14} />
            <span className="tabular-nums font-semibold">{invalides}</span> en erreur
          </span>
        )}
        {lignes.length > 50 && (
          <span className="text-xs text-muted ml-auto">Aperçu des 50 premières lignes</span>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/5 text-xs text-muted uppercase tracking-wider">
                <th className="px-3 py-2 text-left font-medium w-12">#</th>
                {champsAffiches.map((c) => (
                  <th key={c.cle} className="px-3 py-2 text-left font-medium">{c.libelle}</th>
                ))}
                <th className="px-3 py-2 text-left font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {apercu.map((l) => (
                <tr key={l.index} className={l.erreurs.length > 0 ? "bg-danger/5" : ""}>
                  <td className="px-3 py-2 text-muted tabular-nums">{l.index + 2}</td>
                  {champsAffiches.map((c) => (
                    <td key={c.cle} className="px-3 py-2 text-foreground truncate max-w-[180px]">
                      {l.donnees[c.cle] ?? <span className="text-muted/40">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    {l.erreurs.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-success text-xs">
                        <CheckCircle2 size={11} /> OK
                      </span>
                    ) : (
                      <span className="text-danger text-xs">{l.erreurs.join(" · ")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
