import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  utilisateur!: UtilisateurSessionDto;
}
