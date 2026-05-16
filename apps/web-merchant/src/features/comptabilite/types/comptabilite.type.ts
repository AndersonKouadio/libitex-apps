export type TypeCompte = "ACTIF" | "PASSIF" | "CHARGE" | "PRODUIT";

export interface ICompteOhada {
  id: string;
  code: string;
  label: string;
  type: TypeCompte;
}

export interface ILigneEcriture {
  accountCode: string;
  accountLabel: string;
  debit: number;
  credit: number;
  description: string | null;
}

export interface IEcritureComptable {
  id: string;
  date: string;            // YYYY-MM-DD
  pieceNumber: string;     // VTE-2026-0001
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  totalDebit: number;
  totalCredit: number;
  lignes: ILigneEcriture[];
}

export interface ILigneBalance {
  code: string;
  label: string;
  type: TypeCompte;
  totalDebit: number;
  totalCredit: number;
  /** Solde = debit - credit (positif pour actif/charge). */
  solde: number;
}
