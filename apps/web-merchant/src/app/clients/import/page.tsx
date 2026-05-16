"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CsvImportFlow } from "@/components/csv-import/csv-import-flow";
import { CHAMPS_CLIENT } from "@/lib/csv";
import { clientAPI } from "@/features/client/apis/client.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

const EXEMPLE_CSV = `prenom,nom,telephone,email,adresse
Aminata,Diallo,+221770001234,aminata@example.com,Plateau Dakar
Moussa,Camara,+221770005678,,Almadies Dakar
Fatou,Sow,+221770009999,fatou@example.com,`;

function validerClient(d: Record<string, string | undefined>): string[] {
  const erreurs: string[] = [];
  if (!d.prenom || d.prenom.length === 0) erreurs.push("Prénom requis");
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    erreurs.push("Email invalide");
  }
  return erreurs;
}

export default function PageImportClients() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  async function lancerImport(items: Record<string, string | undefined>[]) {
    const clients = items.map((d) => ({
      prenom: d.prenom!,
      nomFamille: d.nomFamille,
      telephone: d.telephone,
      email: d.email,
      adresse: d.adresse,
      notes: d.notes,
    }));
    const res = await clientAPI.importer(token!, clients);
    queryClient.invalidateQueries({ queryKey: ["client"] });
    return res;
  }

  return (
    <CsvImportFlow
      titre="Importer des clients depuis un CSV"
      descriptionUpload="Sélectionnez un CSV exporté de votre Excel ou ancien outil."
      champs={CHAMPS_CLIENT}
      validerLigne={validerClient}
      onImport={lancerImport}
      urlRetour="/clients"
      libelleRetour="Retour aux clients"
      exempleCsv={EXEMPLE_CSV}
    />
  );
}
