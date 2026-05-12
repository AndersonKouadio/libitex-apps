import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ActivitySector } from "@libitex/shared";

export class ConnexionDto {
  @ApiProperty({ example: "amadou@boutique-dakar.sn" })
  @IsEmail({}, { message: "Adresse email invalide" })
  email!: string;

  @ApiProperty({ example: "motdepasse123" })
  @IsString()
  @MinLength(6, { message: "Le mot de passe doit contenir au moins 6 caractères" })
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
  @MinLength(6, { message: "Le mot de passe doit contenir au moins 6 caractères" })
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

  @ApiPropertyOptional({ example: "Boutique principale", description: "Nom du point de vente initial. Vide → 'Boutique principale'." })
  @IsString()
  @IsOptional()
  nomPointDeVente?: string;

  @ApiPropertyOptional({ example: "Plateau, avenue Pompidou — Dakar" })
  @IsString()
  @IsOptional()
  adresseBoutique?: string;
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

  @ApiPropertyOptional({ example: "Boutique principale", description: "Nom du point de vente initial. Vide → 'Boutique principale'." })
  @IsString()
  @IsOptional()
  nomPointDeVente?: string;

  @ApiPropertyOptional({ example: "Plateau, avenue Pompidou — Dakar" })
  @IsString()
  @IsOptional()
  adresseBoutique?: string;
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
  mustChangePassword!: boolean;
}

export class ChangerMotDePasseDto {
  @ApiProperty({ description: "Mot de passe actuel ou temporaire" })
  @IsString()
  @MinLength(1, { message: "Mot de passe actuel requis" })
  motDePasseActuel!: string;

  @ApiProperty({ example: "nouveauMotDePasse123" })
  @IsString()
  @MinLength(8, { message: "Le nouveau mot de passe doit contenir au moins 8 caractères" })
  nouveauMotDePasse!: string;
}

export class DemanderResetDto {
  @ApiProperty({ example: "amadou@boutique-dakar.sn" })
  @IsEmail({}, { message: "Adresse email invalide" })
  email!: string;
}

/**
 * Body POST /auth/refresh. Le refresh token est verifie cryptographiquement
 * (signature + hash en DB) puis utilise une seule fois (rotation).
 */
export class RafraichirTokenDto {
  @ApiProperty({ description: "Refresh token JWT recu lors de la derniere connexion" })
  @IsString({ message: "Le refresh token doit etre une chaine" })
  @IsNotEmpty({ message: "Le refresh token est requis" })
  refreshToken!: string;
}

export class RafraichirTokenResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;
}

export class ModifierProfilDto {
  @ApiPropertyOptional({ example: "Amadou" })
  @IsString()
  @IsOptional()
  prenom?: string;

  @ApiPropertyOptional({ example: "Diallo" })
  @IsString()
  @IsOptional()
  nomFamille?: string;

  @ApiPropertyOptional({ example: "+221770001234" })
  @IsString()
  @IsOptional()
  telephone?: string;
}

export class SupprimerCompteDto {
  @ApiProperty({ description: "Mot de passe pour confirmer la suppression du compte" })
  @IsString()
  @MinLength(1, { message: "Mot de passe requis" })
  motDePasse!: string;
}

export class ReinitialiserMotDePasseDto {
  @ApiProperty({ description: "Token reçu par email" })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({ example: "nouveauMotDePasse123" })
  @IsString()
  @MinLength(8, { message: "Le nouveau mot de passe doit contenir au moins 8 caractères" })
  nouveauMotDePasse!: string;
}

export class BoutiqueResumeDto {
  id!: string;
  nom!: string;
  slug!: string;
  secteurActivite!: string;
  devise!: string;
  role!: string;
  isOwner!: boolean;
  /** Taux TVA par defaut applique aux nouveaux produits. */
  tauxTva!: number;
  /** Methodes de paiement activees au POS. */
  methodesPaiement!: Array<"CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CREDIT">;
}

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  utilisateur!: UtilisateurSessionDto;
  boutiques!: BoutiqueResumeDto[];
  boutiqueActive!: BoutiqueResumeDto;
}
