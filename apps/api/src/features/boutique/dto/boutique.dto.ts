import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsEmail, IsEnum, IsArray, IsNumber, Min, Max, MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ActivitySector, ProductType } from "@libitex/shared";
import { SanitizeHtmlString } from "../../../common/sanitize/strip-html";

const METHODES_PAIEMENT = ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CREDIT"] as const;

export class ModifierBoutiqueDto {
  @ApiPropertyOptional()
  @SanitizeHtmlString()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  nom?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(10)
  @IsOptional()
  devise?: string;

  @ApiPropertyOptional({ enum: ActivitySector })
  @IsEnum(ActivitySector)
  @IsOptional()
  secteurActivite?: ActivitySector;

  @ApiPropertyOptional({ enum: ProductType, isArray: true })
  @IsArray()
  @IsEnum(ProductType, { each: true })
  @IsOptional()
  typesProduitsAutorises?: ProductType[];

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @SanitizeHtmlString()
  @IsString()
  @MaxLength(50)
  @IsOptional()
  telephone?: string;

  @ApiPropertyOptional()
  @SanitizeHtmlString()
  @IsString()
  @MaxLength(500)
  @IsOptional()
  adresse?: string;

  @ApiPropertyOptional({
    description: "Taux de TVA par defaut (%) applique aux nouveaux produits. 0-100.",
    example: 18,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  tauxTva?: number;

  @ApiPropertyOptional({
    description: "Methodes de paiement activees pour le POS",
    enum: METHODES_PAIEMENT, isArray: true,
  })
  @IsArray()
  @IsEnum(METHODES_PAIEMENT, { each: true })
  @IsOptional()
  methodesPaiement?: typeof METHODES_PAIEMENT[number][];
}

export class BoutiqueDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nom!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ActivitySector })
  secteurActivite!: ActivitySector;

  @ApiProperty({ enum: ProductType, isArray: true })
  typesProduitsAutorises!: ProductType[];

  @ApiProperty()
  devise!: string;

  @ApiProperty({ required: false, nullable: true })
  email!: string | null;

  @ApiProperty({ required: false, nullable: true })
  telephone!: string | null;

  @ApiProperty({ required: false, nullable: true })
  adresse!: string | null;

  @ApiProperty({ description: "Taux de TVA par défaut (%)", example: 18 })
  tauxTva!: number;

  @ApiProperty({ enum: METHODES_PAIEMENT, isArray: true })
  methodesPaiement!: typeof METHODES_PAIEMENT[number][];
}
