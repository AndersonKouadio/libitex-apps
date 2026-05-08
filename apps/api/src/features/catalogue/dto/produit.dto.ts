import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray,
  ValidateNested, IsBoolean, Min, IsUrl, ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UniteMesure } from "@libitex/shared";

export enum TypeProduit {
  SIMPLE = "SIMPLE",
  VARIANT = "VARIANT",
  SERIALIZED = "SERIALIZED",
  PERISHABLE = "PERISHABLE",
  MENU = "MENU",
}

// --- Requete ---

export class CreerVarianteDto {
  @ApiProperty({ example: "SKU-TEL-001" })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiPropertyOptional({ example: "Noir 128Go" })
  @IsString()
  @IsOptional()
  nom?: string;

  @ApiPropertyOptional({ example: { couleur: "Noir", stockage: "128Go" } })
  @IsOptional()
  attributs?: Record<string, string>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  codeBarres?: string;

  @ApiPropertyOptional({ example: 95000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  prixAchat?: number;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(0)
  prixDetail!: number;

  @ApiPropertyOptional({ example: 130000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  prixGros?: number;

  @ApiPropertyOptional({ example: 120000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  prixVip?: number;

  @ApiPropertyOptional({
    enum: UniteMesure, example: UniteMesure.PIECE,
    description: "Unite de vente (PIECE par defaut). KG/G pour le vrac, M/CM pour le metre, L/ML pour le volume.",
  })
  @IsEnum(UniteMesure)
  @IsOptional()
  uniteVente?: UniteMesure;

  @ApiPropertyOptional({
    example: 0.1,
    description: "Pas minimum a la saisie au POS (ex: 0.1 kg, 5 cm). Null = entiers seulement.",
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  pasMin?: number;

  @ApiPropertyOptional({
    example: false,
    description: "Vrai si le prix de detail est par unite de mesure (au kg, au metre). Faux = prix forfaitaire.",
  })
  @IsBoolean()
  @IsOptional()
  prixParUnite?: boolean;
}

export class CreerProduitDto {
  @ApiProperty({ example: "Samsung Galaxy A15" })
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @ApiPropertyOptional({ example: "Smartphone 4G, écran 6.5 pouces" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: TypeProduit, example: TypeProduit.SIMPLE })
  @IsEnum(TypeProduit)
  typeProduit!: TypeProduit;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categorieId?: string;

  @ApiPropertyOptional({ example: "Samsung" })
  @IsString()
  @IsOptional()
  marque?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  codeBarresEan13?: string;

  @ApiPropertyOptional({ example: 18 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  tauxTva?: number;

  @ApiPropertyOptional({ description: "URLs des images du produit", type: [String] })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(6)
  @IsUrl({}, { each: true, message: "URL d'image invalide" })
  images?: string[];

  @ApiProperty({ type: [CreerVarianteDto] })
  @ValidateNested({ each: true })
  @Type(() => CreerVarianteDto)
  @IsArray()
  variantes!: CreerVarianteDto[];
}

export class ModifierProduitDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categorieId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  marque?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  actif?: boolean;
}

export class CreerCategorieDto {
  @ApiProperty({ example: "Electronique" })
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentId?: string;
}

// --- Reponse ---

export class VarianteResponseDto {
  id!: string;
  sku!: string;
  nom!: string | null;
  attributs!: Record<string, string>;
  codeBarres!: string | null;
  prixAchat!: number;
  prixDetail!: number;
  prixGros!: number | null;
  prixVip!: number | null;
  uniteVente!: UniteMesure;
  pasMin!: number | null;
  prixParUnite!: boolean;
}

export class ProduitResponseDto {
  id!: string;
  nom!: string;
  description!: string | null;
  typeProduit!: string;
  marque!: string | null;
  categorieId!: string | null;
  tauxTva!: number;
  images!: string[];
  actif!: boolean;
  variantes!: VarianteResponseDto[];
  creeLe!: string;
}

export class CategorieResponseDto {
  id!: string;
  nom!: string;
  slug!: string;
  parentId!: string | null;
}
