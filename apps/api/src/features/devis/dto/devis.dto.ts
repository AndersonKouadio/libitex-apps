import {
  IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsUUID,
  IsDateString, IsNotEmpty, Min, ArrayMinSize, IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationDto } from "../../../common/dto/pagination.dto";

// ─── Requete : Creer un devis ───────────────────────────────────────────

export class LigneDevisCreationDto {
  /** Variante du catalogue. Null = ligne libre (forfait, prestation). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  varianteId?: string;

  /** Obligatoire si pas de varianteId, sinon repris de la variante. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nomProduit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ minimum: 0.001 })
  @IsNumber()
  @Min(0.001)
  quantite!: number;

  /** Prix unitaire HT. Si absent, on prend priceRetail de la variante. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  prixUnitaire?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  remise?: number;

  /** Taux TVA en pourcentage. Si absent, on prend taxRate du produit. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  tauxTva?: number;
}

export class CreerDevisDto {
  @ApiProperty()
  @IsUUID()
  clientId!: string;

  @ApiProperty({ description: "Date d'expiration ISO 8601 (YYYY-MM-DD ou full ISO)" })
  @IsDateString()
  validJusquau!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conditionsPaiement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conditionsLivraison?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notesInternes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notesClient?: string;

  @ApiPropertyOptional({ default: 0, description: "Remise globale en montant fixe" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  remiseGlobale?: number;

  @ApiProperty({ type: [LigneDevisCreationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LigneDevisCreationDto)
  lignes!: LigneDevisCreationDto[];
}

// ─── Requete : Modifier un devis (DRAFT seulement) ─────────────────────

export class ModifierDevisDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validJusquau?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conditionsPaiement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conditionsLivraison?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notesInternes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notesClient?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  remiseGlobale?: number;

  /** Si fourni : remplace toutes les lignes existantes. */
  @ApiPropertyOptional({ type: [LigneDevisCreationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneDevisCreationDto)
  lignes?: LigneDevisCreationDto[];
}

// ─── Requete : Lister (filtres + pagination) ────────────────────────────

export class ListerDevisQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ["DRAFT", "SENT", "ACCEPTED", "REFUSED", "EXPIRED", "CONVERTED", "CANCELLED"] })
  @IsOptional()
  @IsString()
  statut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: "Date debut emission (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @ApiPropertyOptional({ description: "Date fin emission (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @ApiPropertyOptional({ description: "Recherche texte (numero ou nom client)" })
  @IsOptional()
  @IsString()
  recherche?: string;
}

// ─── Reponse : Resume pour liste ────────────────────────────────────────

export class DevisResumeDto {
  id!: string;
  numero!: string;
  statut!: string;
  dateEmission!: Date | null;
  validJusquau!: Date;
  sousTotal!: number;
  totalTva!: number;
  remiseGlobale!: number;
  total!: number;
  clientId!: string;
  nomClient!: string | null;
  telephoneClient!: string | null;
  envoyeLe!: Date | null;
  reponduLe!: Date | null;
  convertiLe!: Date | null;
  creeLe!: Date | null;
}

// ─── Reponse : Detail complet avec lignes ──────────────────────────────

export class LigneDevisResponseDto {
  id!: string;
  position!: number;
  varianteId!: string | null;
  sku!: string | null;
  nomProduit!: string;
  nomVariante!: string | null;
  description!: string | null;
  quantite!: number;
  prixUnitaire!: number;
  remise!: number;
  tauxTva!: number;
  sousTotalLigne!: number;
  tvaLigne!: number;
  totalLigne!: number;
}

export class DevisDetailDto extends DevisResumeDto {
  conditionsPaiement!: string | null;
  conditionsLivraison!: string | null;
  notesInternes!: string | null;
  notesClient!: string | null;
  emailClient!: string | null;
  adresseClient!: string | null;
  convertiVersFactureId!: string | null;
  prenomAuteur!: string | null;
  nomAuteur!: string | null;
  modifieLe!: Date | null;
  lignes!: LigneDevisResponseDto[];
}
