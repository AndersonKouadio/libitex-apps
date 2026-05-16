"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CsvImportFlow } from "@/components/csv-import/csv-import-flow";
import { CHAMPS_STOCK_INITIAL } from "@/lib/csv";
import { stockAPI } from "@/features/stock/apis/stock.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

const EXEMPLE_CSV = `sku,emplacement,quantite,numeroLot,dateExpiration
COCA-33,Andy Resto Cocody,120,,
SPRITE-33,Andy Resto Cocody,80,,
SAUCE-PIQ-250,Andy Resto Cocody,45,LOT2026-A,2026-12-31`;

function validerLigne(d: Record<string, string | undefined>): string[] {
  const erreurs: string[] = [];
  if (!d.sku) erreurs.push("SKU requis");
  if (!d.nomEmplacement) erreurs.push("Emplacement requis");
  const qte = d.quantite ? Number(d.quantite.replace(/\s/g, "").replace(",", ".")) : NaN;
  if (!Number.isFinite(qte) || qte <= 0) {
    erreurs.push("Quantité invalide (doit être > 0)");
  }
  if (d.dateExpiration && !/^\d{4}-\d{2}-\d{2}$/.test(d.dateExpiration)) {
    erreurs.push("Date d'expiration doit être au format YYYY-MM-DD");
  }
  return erreurs;
}

export default function PageImportStockInitial() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  async function lancerImport(items: Record<string, string | undefined>[]) {
    const lignes = items.map((d) => ({
      sku: d.sku!,
      nomEmplacement: d.nomEmplacement!,
      quantite: Number(d.quantite!.replace(/\s/g, "").replace(",", ".")),
      numeroLot: d.numeroLot,
      dateExpiration: d.dateExpiration,
      note: d.note,
    }));
    const res = await stockAPI.importerStock(token!, lignes);
    queryClient.invalidateQueries({ queryKey: ["stock"] });
    return res;
  }

  return (
    <CsvImportFlow
      titre="Importer le stock initial"
      descriptionUpload="Renseignez les quantités existantes par produit et par emplacement. Une ligne = un produit dans un emplacement."
      champs={CHAMPS_STOCK_INITIAL}
      validerLigne={validerLigne}
      onImport={lancerImport}
      urlRetour="/stock"
      libelleRetour="Retour au stock"
      exempleCsv={EXEMPLE_CSV}
    />
  );
}
