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
}

export class CommandeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() numero!: string;
  @ApiProperty() fournisseurId!: string;
  @ApiProperty() nomFournisseur!: string;
  @ApiProperty() emplacementId!: string;
  @ApiProperty() statut!: string;
  @ApiProperty() montantTotal!: number;
  @ApiProperty({ nullable: true }) dateAttendue!: string | null;
  @ApiProperty({ nullable: true }) dateReception!: string | null;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() creeLe!: string;
  @ApiProperty({ type: [LigneCommandeResponseDto], required: false })
  lignes?: LigneCommandeResponseDto[];
}
