import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ActivitySector } from "@libitex/shared";

export class ConnexionDto {
  @ApiProperty({ example: "amadou@boutique-dakar.sn" })
  @IsEmail({}, { message: "Adresse email invalide" })
  email!: string;

  @ApiProperty({ example: "motdepasse123" })
  @IsString()
  @MinLength(6, { message: "Le mot de passe doit contenir au moins 6 caracteres" })
  motDePasse!: string;
}

export class InscriptionDto {
  @ApiProperty({ example: "Boutique Dakar" })
  @IsString()
  @IsNotEmpty({ message: "Le nom de la boutique est requis" })
  nomBoutique!: string;

  @ApiProperty({ example: "boutique-dakar" })
  @IsString()
  @IsNotEmpty({ message: "L'identifiant boutique est requis" })
  slugBoutique!: string;

  @ApiProperty({ example: "amadou@boutique-dakar.sn" })
  @IsEmail({}, { message: "Adresse email invalide" })
  email!: string;

  @ApiProperty({ example: "motdepasse123" })
  @IsString()
  @MinLength(6, { message: "Le mot de passe doit contenir au moins 6 caracteres" })
  motDePasse!: string;

  @ApiProperty({ example: "Amadou" })
  @IsString()
  @IsNotEmpty()
  prenom!: string;

  @ApiProperty({ example: "Diallo" })
  @IsString()
  @IsNotEmpty()
  nomFamille!: string;

  @ApiPropertyOptional({ example: "+221770001234" })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiPropertyOptional({ example: "XOF" })
  @IsString()
  @IsOptional()
  devise?: string;

  @ApiPropertyOptional({ enum: ActivitySector, example: ActivitySector.AUTRE })
  @IsEnum(ActivitySector)
  @IsOptional()
  secteurActivite?: ActivitySector;
}

export class CreerBoutiqueDto {
  @ApiProperty({ example: "Ma Seconde Boutique" })
  @IsString()
  @IsNotEmpty({ message: "Le nom de la boutique est requis" })
  nomBoutique!: string;

  @ApiProperty({ example: "ma-seconde-boutique" })
  @IsString()
  @IsNotEmpty({ message: "L'identifiant boutique est requis" })
  slugBoutique!: string;

  @ApiPropertyOptional({ example: "XOF" })
  @IsString()
  @IsOptional()
  devise?: string;

  @ApiProperty({ enum: ActivitySector })
  @IsEnum(ActivitySector)
  secteurActivite!: ActivitySector;
}

// --- Reponse ---

export class TokenPayload {
  sub!: string;
  tenantId!: string;
  role!: string;
}

export class UtilisateurSessionDto {
  id!: string;
  tenantId!: string;
  role!: string;
  email!: string;
  prenom!: string;
  nomFamille!: string;
}

export class BoutiqueResumeDto {
  id!: string;
  nom!: string;
  slug!: string;
  secteurActivite!: string;
  devise!: string;
  role!: string;
  isOwner!: boolean;
}

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  utilisateur!: UtilisateurSessionDto;
  boutiques!: BoutiqueResumeDto[];
  boutiqueActive!: BoutiqueResumeDto;
}
