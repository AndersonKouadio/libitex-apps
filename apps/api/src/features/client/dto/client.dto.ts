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

export type SegmentClient = "VIP" | "REGULIER" | "OCCASIONNEL" | "INACTIF" | "NOUVEAU";

export class ClientResponseDto {
  id!: string;
  prenom!: string;
  nomFamille!: string | null;
  telephone!: string | null;
  email!: string | null;
  adresse!: string | null;
  notes!: string | null;
  creeLe!: string;
  /** Agreges (presents quand le client provient de la liste avec joins). */
  segment?: SegmentClient;
  caTotal?: number;
  nbTickets?: number;
  dernierAchat?: string | null;
}

export class KpisClientDto {
  caTotal!: number;
  nbTickets!: number;
  ticketMoyen!: number;
  premierAchat!: string | null;
  dernierAchat!: string | null;
  segment!: SegmentClient;
}

export class LigneHistoriqueClientDto {
  id!: string;
  numeroTicket!: string;
  total!: number;
  completeLe!: string | null;
  emplacementId!: string;
}

export class HistoriqueClientDto {
  data!: LigneHistoriqueClientDto[];
  meta!: { page: number; pageSize: number; total: number; totalPages: number };
}
