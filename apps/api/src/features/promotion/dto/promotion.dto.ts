import { ApiProperty } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsBoolean, IsNumber, IsInt, IsIn, IsDateString,
  Min, MaxLength,
} from "class-validator";

export type TypePromotion = "PERCENTAGE" | "FIXED_AMOUNT";

export class CreerPromotionDto {
  @ApiProperty({ example: "RENTREE10" })
  @IsString() @MaxLength(50)
  code!: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ enum: ["PERCENTAGE", "FIXED_AMOUNT"] })
  @IsIn(["PERCENTAGE", "FIXED_AMOUNT"])
  type!: TypePromotion;

  @ApiProperty({ example: 10, description: "Pourcent pour PERCENTAGE, F CFA pour FIXED_AMOUNT" })
  @IsNumber() @Min(0)
  valeur!: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional() @IsNumber() @Min(0)
  montantMin?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsNumber() @Min(0)
  remiseMax?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsDateString()
  dateDebut?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsDateString()
  dateFin?: string;

  @ApiProperty({ required: false, description: "Limite globale d'utilisations" })
  @IsOptional() @IsInt() @Min(1)
  limiteUtilisations?: number;

  @ApiProperty({ required: false, description: "Limite d'utilisations par client" })
  @IsOptional() @IsInt() @Min(1)
  limiteParClient?: number;
}

export class ModifierPromotionDto {
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsIn(["PERCENTAGE", "FIXED_AMOUNT"]) type?: TypePromotion;
  @IsOptional() @IsNumber() @Min(0) valeur?: number;
  @IsOptional() @IsNumber() @Min(0) montantMin?: number;
  @IsOptional() @IsNumber() @Min(0) remiseMax?: number | null;
  @IsOptional() @IsDateString() dateDebut?: string | null;
  @IsOptional() @IsDateString() dateFin?: string | null;
  @IsOptional() @IsInt() @Min(1) limiteUtilisations?: number | null;
  @IsOptional() @IsInt() @Min(1) limiteParClient?: number | null;
  @IsOptional() @IsBoolean() actif?: boolean;
}

export class ValiderCodeDto {
  @ApiProperty()
  @IsString() @MaxLength(50)
  code!: string;

  @ApiProperty({ description: "Total du ticket avant remise" })
  @IsNumber() @Min(0)
  montantTicket!: number;

  @ApiProperty({ required: false, description: "Client lie, pour check perCustomerLimit" })
  @IsOptional() @IsString()
  clientId?: string;
}

export class PromotionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ enum: ["PERCENTAGE", "FIXED_AMOUNT"] }) type!: TypePromotion;
  @ApiProperty() valeur!: number;
  @ApiProperty() montantMin!: number;
  @ApiProperty({ nullable: true }) remiseMax!: number | null;
  @ApiProperty({ nullable: true }) dateDebut!: string | null;
  @ApiProperty({ nullable: true }) dateFin!: string | null;
  @ApiProperty({ nullable: true }) limiteUtilisations!: number | null;
  @ApiProperty() usageCount!: number;
  @ApiProperty({ nullable: true }) limiteParClient!: number | null;
  @ApiProperty() actif!: boolean;
  @ApiProperty() creeLe!: string;
}

export class ValidationResultDto {
  @ApiProperty() valide!: boolean;
  @ApiProperty({ nullable: true }) raison!: string | null;
  @ApiProperty({ description: "Montant exact de la remise calcule (F CFA)" })
  remise!: number;
  @ApiProperty({ required: false }) promotion?: PromotionResponseDto;
}

/**
 * Module 11 D3 : statistiques consolidees pour un code promo.
 */
export class StatsPromotionDto {
  @ApiProperty() nbUsages!: number;
  @ApiProperty({ description: "Total des remises distribuees (F CFA)" })
  totalRemise!: number;
  @ApiProperty({ description: "CA genere = somme des tickets utilisant le code" })
  caGenere!: number;
  @ApiProperty({ type: [Object], description: "Top 5 clients utilisateurs" })
  topClients!: Array<{
    customerId: string;
    nomComplet: string;
    nbUsages: number;
    totalRemise: number;
  }>;
}
