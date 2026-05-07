import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray,
  ValidateNested, IsBoolean, Min, IsUrl, ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum TypeProduit {
  SIMPLE = "SIMPLE",
  VARIANT = "VARIANT",
  SERIALIZED = "SERIALIZED",
  PERISHABLE = "PERISHABLE",
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
