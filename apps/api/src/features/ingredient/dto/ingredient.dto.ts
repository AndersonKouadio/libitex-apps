import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray,
  ValidateNested, Min, IsUUID,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UniteMesure } from "@libitex/shared";

// --- Requete ---

export class CreerIngredientDto {
  @ApiProperty({ example: "Farine de ble" })
  @IsString()
  @IsNotEmpty({ message: "Nom requis" })
  nom!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: UniteMesure, example: UniteMesure.KG })
  @IsEnum(UniteMesure)
  unite!: UniteMesure;

  @ApiPropertyOptional({ description: "Cout d'achat unitaire (par 1 kg, 1 L, 1 piece...)", example: 850 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  prixUnitaire?: number;

  @ApiPropertyOptional({ description: "Seuil d'alerte stock bas", example: 10 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  seuilAlerte?: number;
}

export class ModifierIngredientDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: UniteMesure })
  @IsEnum(UniteMesure)
  @IsOptional()
  unite?: UniteMesure;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  prixUnitaire?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  seuilAlerte?: number;
}

export class EntreeIngredientDto {
  @ApiProperty()
  @IsUUID("4")
  ingredientId!: string;

  @ApiProperty()
  @IsUUID("4")
  emplacementId!: string;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @Min(0.001, { message: "La quantite doit etre superieure a 0" })
  quantite!: number;

  @ApiPropertyOptional({ enum: UniteMesure, description: "Unite saisie (sera convertie vers l'unite de base de l'ingredient)" })
  @IsEnum(UniteMesure)
  @IsOptional()
  unite?: UniteMesure;

  @ApiPropertyOptional({ description: "Cout total de la reception" })
  @IsNumber()
  @IsOptional()
  @Min(0)
  coutTotal?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

export class AjustementIngredientDto {
  @ApiProperty()
  @IsUUID("4")
  ingredientId!: string;

  @ApiProperty()
  @IsUUID("4")
  emplacementId!: string;

  @ApiProperty({ description: "Nouvelle quantite physiquement comptee", example: 12.5 })
  @IsNumber()
  @Min(0)
  quantiteReelle!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

export class TransfertIngredientDto {
  @ApiProperty()
  @IsUUID("4")
  ingredientId!: string;

  @ApiProperty({ description: "Emplacement source" })
  @IsUUID("4")
  depuisEmplacementId!: string;

  @ApiProperty({ description: "Emplacement destination" })
  @IsUUID("4")
  versEmplacementId!: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0.001, { message: "La quantite doit etre superieure a 0" })
  quantite!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

// --- Recettes ---

export class LigneRecetteDto {
  @ApiProperty()
  @IsUUID("4")
  ingredientId!: string;

  @ApiProperty({ example: 0.25 })
  @IsNumber()
  @Min(0.001)
  quantite!: number;

  @ApiProperty({ enum: UniteMesure, example: UniteMesure.KG })
  @IsEnum(UniteMesure)
  unite!: UniteMesure;
}

export class DefinirRecetteDto {
  @ApiProperty({ type: [LigneRecetteDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneRecetteDto)
  lignes!: LigneRecetteDto[];
}

// --- Reponse ---

export class IngredientResponseDto {
  id!: string;
  nom!: string;
  description!: string | null;
  unite!: string;
  prixUnitaire!: number;
  seuilAlerte!: number;
  actif!: boolean;
  creeLe!: string;
}

export class StockIngredientDto {
  ingredientId!: string;
  nomIngredient!: string;
  unite!: string;
  emplacementId!: string;
  quantite!: number;
  enAlerte!: boolean;
}

export class LigneRecetteResponseDto {
  id!: string;
  ingredientId!: string;
  nomIngredient!: string;
  quantite!: number;
  unite!: string;
  ordre!: number;
}
