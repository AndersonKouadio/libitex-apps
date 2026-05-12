import { ApiProperty } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsBoolean, IsNumber, Min, Max, IsInt,
  IsIn, IsUUID, MaxLength,
} from "class-validator";

export class ModifierConfigFideliteDto {
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() actif?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(100) nomProgramme?: string;
  @ApiProperty({ required: false, description: "F CFA depenses pour gagner 1 point" })
  @IsOptional() @IsNumber() @Min(1) ratioGain?: number;
  @ApiProperty({ required: false, description: "Valeur en F CFA d'un point" })
  @IsOptional() @IsNumber() @Min(0.1) valeurPoint?: number;
  @ApiProperty({ required: false, description: "Minimum de points pour utiliser" })
  @IsOptional() @IsInt() @Min(0) seuilUtilisation?: number;
}

export class ConfigFideliteResponseDto {
  @ApiProperty() actif!: boolean;
  @ApiProperty() nomProgramme!: string;
  @ApiProperty() ratioGain!: number;
  @ApiProperty() valeurPoint!: number;
  @ApiProperty() seuilUtilisation!: number;
}

export class AjusterPointsDto {
  /** Fix I6 : bornes -100 000 / +100 000 pour eviter qu'un admin distrait
   *  donne ou retire 1 million de points en un click. Les vraies remises
   *  exceptionnelles passent par plusieurs ajustements documentes. */
  @ApiProperty({ description: "Points a ajouter (>0) ou retirer (<0). Borne [-100000, 100000]." })
  @IsInt()
  @Min(-100000, { message: "Ajustement minimum : -100 000 points" })
  @Max(100000, { message: "Ajustement maximum : 100 000 points" })
  points!: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class SoldeFideliteDto {
  @ApiProperty() solde!: number;
  @ApiProperty() valeurEnFcfa!: number;
}

export class TransactionFideliteDto {
  @ApiProperty() id!: string;
  @ApiProperty() points!: number;
  @ApiProperty() type!: "EARN" | "REDEEM" | "ADJUST";
  @ApiProperty({ nullable: true }) ticketId!: string | null;
  @ApiProperty({ nullable: true }) ticketNumero!: string | null;
  @ApiProperty({ nullable: true }) note!: string | null;
  @ApiProperty() creeLe!: string;
}
