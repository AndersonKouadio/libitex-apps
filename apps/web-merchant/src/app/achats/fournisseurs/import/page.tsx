"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CsvImportFlow } from "@/components/csv-import/csv-import-flow";
import { CHAMPS_FOURNISSEUR } from "@/lib/csv";
import { achatAPI } from "@/features/achat/apis/achat.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

const EXEMPLE_CSV = `nom,contact,telephone,email,adresse,conditionsPaiement
Société Alpha,Ibrahim Diop,+221331234567,contact@alpha.sn,Zone industrielle,30 jours fin de mois
Beta Imports,Aminata Sow,+221331111111,info@beta.sn,Port autonome,Comptant
Gamma SARL,,+221332222222,,,15 jours`;

function validerFournisseur(d: Record<string, string | undefined>): string[] {
  const erreurs: string[] = [];
  if (!d.nom || d.nom.length === 0) erreurs.push("Nom requis");
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    erreurs.push("Email invalide");
  }
  return erreurs;
}

export default function PageImportFournisseurs() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  async function lancerImport(items: Record<string, string | undefined>[]) {
    const fournisseurs = items.map((d) => ({
      nom: d.nom!,
      nomContact: d.nomContact,
      telephone: d.telephone,
      email: d.email,
      adresse: d.adresse,
      conditionsPaiement: d.conditionsPaiement,
      notes: d.notes,
    }));
    const res = await achatAPI.importerFournisseurs(token!, fournisseurs);
    queryClient.invalidateQueries({ queryKey: ["achat"] });
    return res;
  }

  return (
    <CsvImportFlow
      titre="Importer des fournisseurs depuis un CSV"
      descriptionUpload="Sélectionnez un CSV avec les coordonnées de vos fournisseurs."
      champs={CHAMPS_FOURNISSEUR}
      validerLigne={validerFournisseur}
      onImport={lancerImport}
      urlRetour="/achats/fournisseurs"
      libelleRetour="Retour aux fournisseurs"
      exempleCsv={EXEMPLE_CSV}
    />
  );
}
