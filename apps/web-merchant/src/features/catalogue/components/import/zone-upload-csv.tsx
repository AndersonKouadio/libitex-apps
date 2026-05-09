"use client";

import { useRef, useState } from "react";
import { Button } from "@heroui/react";
import { Upload, FileText } from "lucide-react";
import { parserCsv, type CsvParsed } from "@/lib/csv";

interface Props {
  onCsv: (csv: CsvParsed, nomFichier: string) => void;
}

export function ZoneUploadCsv({ onCsv }: Props) {
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
          survol ? "border-accent bg-accent/5" : "border-border bg-surface-secondary/30 hover:bg-surface-secondary/50"
        }`}
      >
        <Upload size={28} className="text-muted mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">
          Glissez votre fichier CSV ici, ou cliquez pour le sélectionner
        </p>
        <p className="text-xs text-muted mt-1">
          Format attendu : 1 ligne = 1 produit. Headers reconnus : nom, sku, prixDetail, prixAchat, marque, description…
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

      <div className="mt-4 rounded-lg bg-surface-secondary/40 p-3 flex items-start gap-2">
        <FileText size={14} className="text-muted shrink-0 mt-0.5" />
        <div className="text-xs text-muted">
          <p className="font-medium text-foreground">Modèle minimum :</p>
          <pre className="mt-1 text-[11px] font-mono whitespace-pre-wrap">
{`nom,sku,prixDetail,marque,description
Coca 33cl,COCA-33,500,Coca-Cola,Boisson gazeuse
Sprite 33cl,SPRITE-33,500,Coca-Cola,
Eau Awa 1.5L,EAU-15L,750,Awa,`}
          </pre>
          <p className="mt-1">Une seule variante par ligne. Pour les variantes multiples, créez le produit manuellement.</p>
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
