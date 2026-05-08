import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum, IsUrl, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum CategorieSupplement {
  NOURRITURE = "NOURRITURE",
  BOISSON = "BOISSON",
  ACCESSOIRE = "ACCESSOIRE",
  AUTRE = "AUTRE",
}

export class CreerSupplementDto {
  @ApiProperty({ example: "Sauce piquante" })
  @IsString()
  @IsNotEmpty({ message: "Nom du supplément requis" })
  nom!: string;

  @ApiPropertyOptional({ example: "Sauce maison à base de piment frais" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  prix!: number;

  @ApiProperty({ enum: CategorieSupplement, example: CategorieSupplement.NOURRITURE })
  @IsEnum(CategorieSupplement)
  categorie!: CategorieSupplement;

  @ApiPropertyOptional({ description: "URL de l'image (uploadée via /uploads/image/produits)" })
  @IsUrl({}, { message: "URL d'image invalide" })
  @IsOptional()
  image?: string;
}

export class ModifierSupplementDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  prix?: number;

  @ApiPropertyOptional({ enum: CategorieSupplement })
  @IsEnum(CategorieSupplement)
  @IsOptional()
  categorie?: CategorieSupplement;

  @ApiPropertyOptional()
  @IsUrl({}, { message: "URL d'image invalide" })
  @IsOptional()
  image?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  actif?: boolean;
}

export class SupplementResponseDto {
  id!: string;
  nom!: string;
  description!: string | null;
  prix!: number;
  categorie!: string;
  image!: string | null;
  actif!: boolean;
  creeLe!: string;
}
