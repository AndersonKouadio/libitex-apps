import { ApiProperty } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsBoolean, IsUUID, IsArray, ValidateNested,
  IsNumber, Min, IsIn, IsDateString, MaxLength, ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";

// ─── Fournisseur ───

export class CreerFournisseurDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  nom!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nomContact?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telephone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adresse?: string;

  @ApiProperty({ required: false, description: "Conditions de paiement (ex: 30 jours fin de mois)" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  conditionsPaiement?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ModifierFournisseurDto {
  @IsOptional() @IsString() @MaxLength(255) nom?: string;
  @IsOptional() @IsString() @MaxLength(255) nomContact?: string;
  @IsOptional() @IsString() @MaxLength(50) telephone?: string;
  @IsOptional() @IsString() @MaxLength(255) email?: string;
  @IsOptional() @IsString() adresse?: string;
  @IsOptional() @IsString() @MaxLength(255) conditionsPaiement?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() actif?: boolean;
}

export class FournisseurResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() nom!: string;
  @ApiProperty({ nullable: true }) nomContact!: string | null;
  @ApiProperty({ nullable: true }) telephone!: string | null;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ nullable: true }) adresse!: string | null;
  @ApiProperty({ nullable: true }) conditionsPaiement!: string | null;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() actif!: boolean;
  @ApiProperty() creeLe!: string;
}

// ─── Commande ───

export class LigneCommandeDto {
  @ApiProperty() @IsUUID() varianteId!: string;
  @ApiProperty() @IsNumber() @Min(0.001) quantite!: number;
  @ApiProperty() @IsNumber() @Min(0) prixUnitaire!: number;
}

export class CreerCommandeDto {
  @ApiProperty() @IsUUID() fournisseurId!: string;
  @ApiProperty() @IsUUID() emplacementId!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() dateAttendue?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: [LigneCommandeDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LigneCommandeDto)
  lignes!: LigneCommandeDto[];
}

export class LigneReceptionDto {
  @ApiProperty() @IsUUID() ligneId!: string;
  @ApiProperty({ description: "Quantite recue dans CE versement (cumule cote serveur)" })
  @IsNumber() @Min(0)
  quantite!: number;
}

export class ReceptionCommandeDto {
  @ApiProperty({ type: [LigneReceptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneReceptionDto)
  lignes!: LigneReceptionDto[];

  @ApiProperty({
    required: false,
    description: "Met a jour le prix d'achat de la variante avec le prix de la commande",
  })
  @IsOptional() @IsBoolean()
  majPrixAchat?: boolean;
}

export class ModifierStatutCommandeDto {
  @ApiProperty({ enum: ["DRAFT", "SENT", "CANCELLED"] })
  @IsIn(["DRAFT", "SENT", "CANCELLED"])
  statut!: "DRAFT" | "SENT" | "CANCELLED";
}

export class LigneCommandeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() varianteId!: string;
  @ApiProperty() produitId!: string;
  @ApiProperty() nomProduit!: string;
  @ApiProperty({ nullable: true }) nomVariante!: string | null;
  @ApiProperty() sku!: string;
  @ApiProperty() quantiteCommandee!: number;
  @ApiProperty() quantiteRecue!: number;
  @ApiProperty() prixUnitaire!: number;
  @ApiProperty() totalLigne!: number;
  /** Phase A.4 : CUMP actuel de la variante au moment de la lecture. */
  @ApiProperty({ description: "CUMP actuel de la variante (cout debarque moyen)" })
  cumpActuel!: number;
}

export class CommandeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() numero!: string;
  @ApiProperty() fournisseurId!: string;
  @ApiProperty() nomFournisseur!: string;
  @ApiProperty() emplacementId!: string;
  @ApiProperty() nomEmplacement!: string;
  @ApiProperty() statut!: string;
  @ApiProperty() montantTotal!: number;
  /** Phase A.2 : somme des frais d'approche en devise tenant. */
  @ApiProperty({ description: "Total frais d'approche (landed cost)" })
  fraisTotal!: number;
  /** Phase A.2 : montantTotal + fraisTotal. */
  @ApiProperty({ description: "Cout debarque total = total + frais" })
  totalDebarque!: number;
  /** Phase A.2 : methode de ventilation des frais sur les lignes. */
  @ApiProperty({ enum: ["QUANTITY", "WEIGHT", "VALUE"] })
  methodeAllocation!: "QUANTITY" | "WEIGHT" | "VALUE";
  @ApiProperty({ nullable: true }) dateAttendue!: string | null;
  @ApiProperty({ nullable: true }) dateReception!: string | null;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() creeLe!: string;
  @ApiProperty({ type: [LigneCommandeResponseDto], required: false })
  lignes?: LigneCommandeResponseDto[];
}

// ─── Phase A.2 : Frais d'approche (Landed Cost) ───

export const CATEGORIES_FRAIS = [
  "TRANSPORT", "CUSTOMS", "TRANSIT", "INSURANCE", "HANDLING", "OTHER",
] as const;
export type CategorieFrais = typeof CATEGORIES_FRAIS[number];

export class CreerFraisDto {
  @ApiProperty({ enum: CATEGORIES_FRAIS })
  @IsIn(CATEGORIES_FRAIS as readonly string[])
  categorie!: CategorieFrais;

  @ApiProperty({ example: "Transitaire Maersk" })
  @IsString() @MaxLength(255)
  libelle!: string;

  @ApiProperty({ example: 1500.00, description: "Montant dans la devise de saisie" })
  @Type(() => Number) @IsNumber() @Min(0)
  montant!: number;

  @ApiProperty({ example: "EUR", description: "ISO 4217 (XOF, USD, EUR, CNY...)" })
  @IsString() @MaxLength(3)
  devise!: string;

  @ApiProperty({
    example: 655.957,
    description: "Taux conversion devise saisie -> devise tenant. 1.0 si meme devise.",
  })
  @Type(() => Number) @IsNumber() @Min(0)
  tauxChange!: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class ModifierFraisDto {
  @ApiProperty({ enum: CATEGORIES_FRAIS, required: false })
  @IsOptional() @IsIn(CATEGORIES_FRAIS as readonly string[])
  categorie?: CategorieFrais;
  @IsOptional() @IsString() @MaxLength(255) libelle?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) montant?: number;
  @IsOptional() @IsString() @MaxLength(3) devise?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tauxChange?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string | null;
}

export class FraisResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: CATEGORIES_FRAIS }) categorie!: CategorieFrais;
  @ApiProperty() libelle!: string;
  @ApiProperty() montant!: number;
  @ApiProperty() devise!: string;
  @ApiProperty() tauxChange!: number;
  @ApiProperty({ description: "Montant converti en devise tenant" })
  montantEnBase!: number;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() creeLe!: string;
}
