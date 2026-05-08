import {
  IsEmail, IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsUUID, MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@libitex/shared";

export class InviterMembreDto {
  @ApiProperty({ example: "amadou@boutique.sn" })
  @IsEmail({}, { message: "Adresse email invalide" })
  email!: string;

  @ApiProperty({ example: "Amadou" })
  @IsString()
  @MinLength(1)
  prenom!: string;

  @ApiProperty({ example: "Diallo" })
  @IsString()
  @MinLength(1)
  nomFamille!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CASHIER })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({ description: "Acces a tous les emplacements (true) ou liste specifique" })
  @IsBoolean()
  accessAllLocations!: boolean;

  @ApiPropertyOptional({ type: [String], description: "Liste des emplacements autorises si accessAllLocations=false" })
  @IsArray()
  @IsUUID("4", { each: true })
  @IsOptional()
  locationIds?: string[];
}

export class ModifierMembreDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  accessAllLocations?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  @IsOptional()
  locationIds?: string[];
}

export class MembreResponseDto {
  membershipId!: string;
  userId!: string;
  email!: string;
  prenom!: string;
  nomFamille!: string;
  telephone!: string | null;
  role!: string;
  isOwner!: boolean;
  accessAllLocations!: boolean;
  locationIds!: string[];
  isActive!: boolean;
  invitedAt!: string | null;
  acceptedAt!: string | null;
  derniereConnexion!: string | null;
}

export class InvitationResponseDto {
  membre!: MembreResponseDto;
  motDePasseTemporaire!: string;
  message!: string;
}
