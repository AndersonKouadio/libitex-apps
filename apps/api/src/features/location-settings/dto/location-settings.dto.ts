import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum,
  Min, Max, MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { SanitizeHtmlString } from "../../../common/sanitize/strip-html";

const METHODES_PAIEMENT = ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CREDIT"] as const;

/**
 * Module 15 D1 : DTO de mise a jour partielle des prefs d'un emplacement.
 * Tous les champs sont optionnels — null efface l'override (revient au
 * defaut tenant), undefined ne touche pas le champ.
 */
export class ModifierLocationSettingsDto {
  @ApiPropertyOptional({
    description: "Override TVA en % (0-100). null = herite tenant.",
    nullable: true, example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRateOverride?: number | null;

  @ApiPropertyOptional({
    description: "Override methodes de paiement. null = herite tenant.",
    enum: METHODES_PAIEMENT, isArray: true, nullable: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(METHODES_PAIEMENT, { each: true })
  paymentMethodsOverride?: typeof METHODES_PAIEMENT[number][] | null;

  @ApiPropertyOptional({
    description: "Message libre en bas de ticket (max 200 chars)",
    nullable: true,
  })
  @IsOptional()
  @SanitizeHtmlString()
  @IsString()
  @MaxLength(200)
  ticketFooterMessage?: string | null;

  @ApiPropertyOptional({
    description: "Default impression auto pour les nouvelles sessions caisse",
  })
  @IsOptional()
  @IsBoolean()
  autoPrintDefault?: boolean;

  @ApiPropertyOptional({
    description: "Signature imprimante preferee (vendorId:productId ou nom BT)",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  preferredPrinterSignature?: string | null;

  @ApiPropertyOptional({ description: "Notes admin libres", nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class LocationSettingsResponseDto {
  @ApiProperty() locationId!: string;
  @ApiProperty({ nullable: true }) taxRateOverride!: number | null;
  @ApiProperty({ nullable: true, enum: METHODES_PAIEMENT, isArray: true })
  paymentMethodsOverride!: typeof METHODES_PAIEMENT[number][] | null;
  @ApiProperty({ nullable: true }) ticketFooterMessage!: string | null;
  @ApiProperty() autoPrintDefault!: boolean;
  @ApiProperty({ nullable: true }) preferredPrinterSignature!: string | null;
  @ApiProperty({ nullable: true }) notes!: string | null;
}

/**
 * Module 15 D2 : reglages effectifs (merge tenant defaults + location
 * overrides). Renvoye par le helper "obtenirEffectif" pour les services
 * qui doivent appliquer les bonnes valeurs au runtime (vente, ticket, POS).
 */
export class LocationSettingsEffectifsDto {
  @ApiProperty() locationId!: string;
  @ApiProperty({ description: "TVA effective (override sinon defaut tenant)" })
  taxRate!: number;
  @ApiProperty({ enum: METHODES_PAIEMENT, isArray: true })
  paymentMethods!: typeof METHODES_PAIEMENT[number][];
  @ApiProperty({ nullable: true }) ticketFooterMessage!: string | null;
  @ApiProperty() autoPrintDefault!: boolean;
  @ApiProperty({ nullable: true }) preferredPrinterSignature!: string | null;
}
