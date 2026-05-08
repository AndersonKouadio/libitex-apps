import { IsString, IsNotEmpty, IsOptional, IsEmail } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreerClientDto {
  @ApiProperty({ example: "Aminata" })
  @IsString()
  @IsNotEmpty({ message: "Prénom requis" })
  prenom!: string;

  @ApiPropertyOptional({ example: "Diallo" })
  @IsString()
  @IsOptional()
  nomFamille?: string;

  @ApiPropertyOptional({ example: "+221770001234" })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiPropertyOptional({ example: "aminata@example.com" })
  @IsEmail({}, { message: "Adresse email invalide" })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "Plateau, Dakar" })
  @IsString()
  @IsOptional()
  adresse?: string;

  @ApiPropertyOptional({ example: "Cliente fidèle, préfère Mobile Money" })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ModifierClientDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  prenom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nomFamille?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiPropertyOptional()
  @IsEmail({}, { message: "Adresse email invalide" })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  adresse?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ClientResponseDto {
  id!: string;
  prenom!: string;
  nomFamille!: string | null;
  telephone!: string | null;
  email!: string | null;
  adresse!: string | null;
  notes!: string | null;
  creeLe!: string;
}
