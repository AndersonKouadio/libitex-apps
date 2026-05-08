export interface IClient {
  id: string;
  prenom: string;
  nomFamille: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  notes: string | null;
  creeLe: string;
}
