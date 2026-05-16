import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray,
  ValidateNested, Min, IsInt, IsUUID,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class ListerTicketsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filtrer par emplacement" })
  @IsOptional()
  @IsString()
  emplacementId?: string;

  @ApiPropertyOptional({ description: "Statut : OPEN, PARKED, COMPLETED, CANCELLED" })
  @IsOptional()
  @IsString()
  statut?: string;
}

// --- Enums ---

export enum MethodePaiement {
  ESPECES = "CASH",
  CARTE = "CARD",
  MOBILE_MONEY = "MOBILE_MONEY",
  VIREMENT = "BANK_TRANSFER",
  CREDIT = "CREDIT",
  FIDELITE = "LOYALTY",
}

// --- Requete ---

export class SupplementChoisiDto {
  @ApiProperty({ example: "uuid-supplement" })
  @IsString()
  @IsNotEmpty()
  supplementId!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantite!: number;
}

export class LigneTicketDto {
  @ApiProperty({ example: "uuid-variante" })
  @IsString()
  @IsNotEmpty()
  varianteId!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantite!: number;

  @ApiPropertyOptional({ example: 150000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  prixUnitaire?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  remise?: number;

  @ApiPropertyOptional({ description: "Obligatoire pour produits sérialisés" })
  @IsString()
  @IsOptional()
  numeroSerie?: string;

  @ApiPropertyOptional({ type: [SupplementChoisiDto], description: "Suppléments / extras choisis" })
  @ValidateNested({ each: true })
  @Type(() => SupplementChoisiDto)
  @IsArray()
  @IsOptional()
  supplements?: SupplementChoisiDto[];
}

export class CreerTicketDto {
  @ApiProperty({ example: "uuid-emplacement" })
  @IsString()
  @IsNotEmpty()
  emplacementId!: string;

  @ApiPropertyOptional({
    example: 1500,
    description: "Remise globale appliquée au ticket (montant en F CFA, calculé côté front)",
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  remiseGlobale?: number;

  @ApiPropertyOptional({
    example: "Geste commercial",
    description: "Raison de la remise globale (présélectionnée ou libre)",
  })
  @IsString()
  @IsOptional()
  raisonRemise?: string;

  @ApiPropertyOptional({
    example: "uuid-client",
    description: "Lien vers une fiche client (CRM). Si fourni, le nom/telephone du ticket sont rattaches a ce client pour l'historique d'achats.",
  })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ example: "Amadou Diallo" })
  @IsString()
  @IsOptional()
  nomClient?: string;

  @ApiPropertyOptional({ example: "+225 07 00 00 00" })
  @IsString()
  @IsOptional()
  telephoneClient?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;

  /**
   * Cle d'idempotence fournie par le frontend (UUID v4) pour eviter les
   * doublons en cas de drain offline interrompu apres creerTicket OK
   * mais avant completerTicket. Si la cle est deja vue, le backend
   * retourne le ticket existant (200) au lieu de creer un doublon.
   * Optionnel : les ventes online classiques peuvent l'omettre.
   */
  @ApiPropertyOptional({ description: "UUID v4 pour idempotence du POST" })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiProperty({ type: [LigneTicketDto] })
  @ValidateNested({ each: true })
  @Type(() => LigneTicketDto)
  @IsArray()
  lignes!: LigneTicketDto[];
}

export class PaiementDto {
  @ApiProperty({ enum: MethodePaiement })
  @IsEnum(MethodePaiement)
  methode!: MethodePaiement;

  @ApiProperty({ example: 300000 })
  @IsNumber()
  @Min(0)
  montant!: number;

  @ApiPropertyOptional({ example: "REF-MM-123" })
  @IsString()
  @IsOptional()
  reference?: string;
}

export class CompleterTicketDto {
  @ApiProperty({ type: [PaiementDto] })
  @ValidateNested({ each: true })
  @Type(() => PaiementDto)
  @IsArray()
  paiements!: PaiementDto[];
}

// --- Reponse ---

export class SupplementLigneDto {
  supplementId!: string;
  nom!: string;
  prixUnitaire!: number;
  quantite!: number;
}

export class LigneTicketResponseDto {
  id!: string;
  varianteId!: string;
  nomProduit!: string;
  nomVariante!: string | null;
  sku!: string;
  quantite!: number;
  prixUnitaire!: number;
  remise!: number;
  tauxTva!: number;
  montantTva!: number;
  totalLigne!: number;
  numeroSerie!: string | null;
  numeroBatch!: string | null;
  supplements!: SupplementLigneDto[];
}

export class PaiementResponseDto {
  id!: string;
  methode!: string;
  montant!: number;
  reference!: string | null;
}

export class TicketResponseDto {
  id!: string;
  numeroTicket!: string;
  statut!: string;
  emplacementId!: string;
  sousTotal!: number;
  montantTva!: number;
  montantRemise!: number;
  total!: number;
  clientId!: string | null;
  nomClient!: string | null;
  telephoneClient!: string | null;
  note!: string | null;
  completeLe!: string | null;
  creeLe!: string;
  lignes!: LigneTicketResponseDto[];
  paiements!: PaiementResponseDto[];
  monnaie?: number;
  /** A3 : 'SALE' (défaut) ou 'RETURN'. */
  type?: string;
  /** A3 : ID du ticket d'origine si c'est un retour. */
  refTicketId?: string | null;
}

// ─── Retours POS (A3) ───

export class LigneRetourDto {
  @ApiProperty({ description: "ID de la ligne du ticket original à retourner" })
  @IsUUID()
  ligneId!: string;

  @ApiProperty({ description: "Quantité à retourner (≤ quantité originale non encore retournée)" })
  @IsNumber()
  @Min(0.001)
  quantite!: number;
}

export class RetourTicketDto {
  @ApiProperty({ type: [LigneRetourDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneRetourDto)
  lignes!: LigneRetourDto[];

  @ApiProperty({
    description: "Méthode de remboursement",
    example: "CASH",
    enum: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "CREDIT", "LOYALTY", "OTHER"],
  })
  @IsString()
  @IsNotEmpty()
  methodeRemboursement!: string;

  @ApiPropertyOptional({ description: "Référence externe (numéro de transaction MM, etc.)" })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: "Motif du retour (libre)" })
  @IsOptional()
  @IsString()
  motif?: string;
}

export class RapportZResponseDto {
  sessionId!: string;
  numeroSession!: string;
  emplacementId!: string;
  ouvertA!: string;
  fermeA!: string | null;
  resume!: {
    totalTickets: number;
    chiffreAffaires: number;
    totalTva: number;
    totalRemise: number;
  };
  ventilationPaiements!: {
    methode: string;
    total: number;
    nombre: number;
  }[];
}

export class LigneVentePeriodeDto {
  date!: string;
  recettes!: number;
  nombre!: number;
  tva!: number;
  remises!: number;
  ticketMoyen!: number;
}

export class RapportVentesPeriodeDto {
  debut!: string;
  fin!: string;
  emplacementId!: string | null;
  jours!: LigneVentePeriodeDto[];
  totaux!: {
    recettes: number;
    tickets: number;
    tva: number;
    remises: number;
    ticketMoyen: number;
  };
}

export class LigneTvaDto {
  /** Taux de TVA en %, ex: 0, 9, 18. */
  taux!: number;
  baseHt!: number;
  tva!: number;
  totalTtc!: number;
  nombreLignes!: number;
}

export class RapportTvaDto {
  debut!: string;
  fin!: string;
  emplacementId!: string | null;
  taux!: LigneTvaDto[];
  totaux!: {
    baseHt: number;
    tva: number;
    totalTtc: number;
    nombreLignes: number;
  };
}

export class LigneMargeDto {
  variantId!: string;
  nomProduit!: string;
  nomVariante!: string | null;
  sku!: string;
  quantiteTotale!: number;
  chiffreAffaires!: number;
  coutTotal!: number;
  margeBrute!: number;
  margePourcent!: number;
  prixAchatManquant!: boolean;
}

export class RapportMargesDto {
  debut!: string;
  fin!: string;
  emplacementId!: string | null;
  lignes!: LigneMargeDto[];
  totaux!: {
    chiffreAffaires: number;
    coutTotal: number;
    margeBrute: number;
    margePourcent: number;
    quantiteTotale: number;
  };
}

/**
 * Rapport Z agrege par jour pour un emplacement (independant des sessions).
 * Inclut top produits du jour et ventes par heure pour analyse rapide.
 */
export class RapportZJourResponseDto {
  emplacementId!: string;
  date!: string;
  resume!: {
    totalTickets: number;
    chiffreAffaires: number;
    totalTva: number;
    totalRemise: number;
  };
  ventilationPaiements!: {
    methode: string;
    total: number;
    nombre: number;
  }[];
  topProduits!: {
    variantId: string;
    nomProduit: string;
    nomVariante: string | null;
    sku: string;
    quantite: number;
    chiffreAffaires: number;
  }[];
  ventesParHeure!: {
    heure: number;
    recettes: number;
    nombre: number;
  }[];
}
