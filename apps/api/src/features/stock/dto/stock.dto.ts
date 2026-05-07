import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreerEmplacementDto {
  @ApiProperty({ example: "Entrepot Central Dakar" })
  @IsString()
  @IsNotEmpty({ message: "Le nom de l'emplacement est requis" })
  nom!: string;

  @ApiPropertyOptional({ example: "WAREHOUSE" })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: "Zone Industrielle, Dakar" })
  @IsString()
  @IsOptional()
  adresse?: string;
}

export class EntreeStockDto {
  @ApiProperty()
  @IsUUID("4", { message: "Identifiant variante invalide" })
  varianteId!: string;

  @ApiProperty()
  @IsUUID("4", { message: "Identifiant emplacement invalide" })
  emplacementId!: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(1, { message: "La quantité doit etre superieure a 0" })
  quantite!: number;

  @ApiPropertyOptional({ example: "Livraison fournisseur ref. CMD-2026-042" })
  @IsString()
  @IsOptional()
  note?: string;
}

export class AjustementStockDto {
  @ApiProperty()
  @IsUUID("4", { message: "Identifiant variante invalide" })
  varianteId!: string;

  @ApiProperty()
  @IsUUID("4", { message: "Identifiant emplacement invalide" })
  emplacementId!: string;

  @ApiProperty({ example: -5, description: "Positif ou negatif" })
  @IsNumber()
  quantite!: number;

  @ApiProperty({ example: "Ecart inventaire — 5 unites manquantes" })
  @IsString()
  @IsNotEmpty({ message: "La justification est obligatoire" })
  note!: string;
}

export class TransfertStockDto {
  @ApiProperty()
  @IsUUID("4")
  varianteId!: string;

  @ApiProperty()
  @IsUUID("4")
  depuisEmplacementId!: string;

  @ApiProperty()
  @IsUUID("4")
  versEmplacementId!: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  quantite!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

// --- Reponse ---

export class EmplacementResponseDto {
  id!: string;
  nom!: string;
  type!: string;
  adresse!: string | null;
}

export class StockActuelResponseDto {
  varianteId!: string;
  emplacementId!: string;
  quantite!: number;
}

export class StockEmplacementResponseDto {
  varianteId!: string;
  sku!: string;
  nomProduit!: string;
  nomVariante!: string | null;
  typeProduit!: string;
  quantite!: number;
}

export class MouvementResponseDto {
  id!: string;
  typeMouvement!: string;
  quantite!: number;
  note!: string | null;
  creeLe!: string;
}
