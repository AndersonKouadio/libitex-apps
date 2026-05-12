import { ApiProperty } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsUUID, IsInt, IsIn, IsDateString, Min, MaxLength,
} from "class-validator";

export type StatutReservation =
  | "PENDING" | "CONFIRMED" | "SEATED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export class CreerReservationDto {
  @ApiProperty() @IsUUID() emplacementId!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() clientId?: string;
  @ApiProperty() @IsString() @MaxLength(255) nomClient!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(50) telephone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(50) numeroTable?: string;
  @ApiProperty({ example: "2026-05-15T19:30:00.000Z" })
  @IsDateString()
  dateReservation!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) nombrePersonnes!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}

export class ModifierReservationDto {
  @IsOptional() @IsUUID() clientId?: string | null;
  @IsOptional() @IsString() @MaxLength(255) nomClient?: string;
  @IsOptional() @IsString() @MaxLength(50) telephone?: string | null;
  @IsOptional() @IsString() @MaxLength(50) numeroTable?: string | null;
  @IsOptional() @IsDateString() dateReservation?: string;
  @IsOptional() @IsInt() @Min(1) nombrePersonnes?: number;
  @IsOptional() @IsString() notes?: string | null;
  @IsOptional() @IsIn(["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"])
  statut?: StatutReservation;
}

export class ReservationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() emplacementId!: string;
  @ApiProperty({ nullable: true }) clientId!: string | null;
  @ApiProperty() nomClient!: string;
  @ApiProperty({ nullable: true }) telephone!: string | null;
  @ApiProperty({ nullable: true }) numeroTable!: string | null;
  @ApiProperty() dateReservation!: string;
  @ApiProperty() nombrePersonnes!: number;
  @ApiProperty() statut!: StatutReservation;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() creeLe!: string;
}

export class ResumeJourDto {
  @ApiProperty() date!: string;
  @ApiProperty() totalReservations!: number;
  @ApiProperty() totalCouverts!: number;
  @ApiProperty({ type: Object, description: "Compteur par statut" })
  parStatut!: Record<string, { nombre: number; couverts: number }>;
}
