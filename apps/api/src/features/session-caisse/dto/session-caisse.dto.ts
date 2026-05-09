import {
  IsString, IsNotEmpty, IsOptional, IsNumber, IsObject,
  Min, IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationDto } from "../../../common/dto/pagination.dto";

// --- Methodes de paiement (alignes avec paymentMethodEnum) ---

export enum MethodeFond {
  CASH = "CASH",
  CARD = "CARD",
  MOBILE_MONEY = "MOBILE_MONEY",
  BANK_TRANSFER = "BANK_TRANSFER",
}

// --- Requetes ---

export class FondParMethodeDto {
  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  CASH?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  CARD?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  MOBILE_MONEY?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  BANK_TRANSFER?: number;
}

export class OuvrirSessionDto {
  @ApiProperty({ example: "uuid-emplacement" })
  @IsString()
  @IsNotEmpty()
  emplacementId!: string;

  @ApiProperty({
    type: FondParMethodeDto,
    description: "Fonds initiaux par methode (espèces obligatoire)",
  })
  @IsObject()
  @Type(() => FondParMethodeDto)
  fondInitial!: FondParMethodeDto;

  @ApiPropertyOptional({ example: "Caisse principale, ouverture matin" })
  @IsString()
  @IsOptional()
  commentaire?: string;
}

export class FermerSessionDto {
  @ApiProperty({
    type: FondParMethodeDto,
    description: "Comptage reel par methode a la fermeture",
  })
  @IsObject()
  @Type(() => FondParMethodeDto)
  fondFinalDeclare!: FondParMethodeDto;

  @ApiPropertyOptional({ example: "Petit ecart en especes (- 500)" })
  @IsString()
  @IsOptional()
  commentaire?: string;
}

export class ListerSessionsQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emplacementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caissierId?: string;

  @ApiPropertyOptional({ enum: ["OPEN", "CLOSED"] })
  @IsOptional()
  @IsEnum(["OPEN", "CLOSED"])
  statut?: "OPEN" | "CLOSED";

  @ApiPropertyOptional({ description: "AAAA-MM-JJ" })
  @IsOptional()
  @IsString()
  dateDebut?: string;

  @ApiPropertyOptional({ description: "AAAA-MM-JJ" })
  @IsOptional()
  @IsString()
  dateFin?: string;
}

// --- Reponses ---

export class FondParMethodeResponseDto {
  CASH!: number;
  CARD!: number;
  MOBILE_MONEY!: number;
  BANK_TRANSFER!: number;
}

export class SessionCaisseResponseDto {
  id!: string;
  numeroSession!: string;
  emplacementId!: string;
  emplacementNom!: string;
  caissierId!: string;
  caissierNom!: string;
  statut!: "OPEN" | "CLOSED";
  fondInitial!: FondParMethodeResponseDto;
  fondFinalTheorique!: FondParMethodeResponseDto | null;
  fondFinalDeclare!: FondParMethodeResponseDto | null;
  ecart!: FondParMethodeResponseDto | null;
  commentaireOuverture!: string | null;
  commentaireFermeture!: string | null;
  ouvertA!: string;
  fermeA!: string | null;
  // Stats temps reel pour la session
  nombreTickets?: number;
  totalEncaisse?: number;
}

export class TicketEnCoursDto {
  id!: string;
  numeroTicket!: string;
  statut!: "OPEN" | "PARKED";
  total!: number;
  creeLe!: string;
}

export class RecapitulatifFermetureDto {
  session!: SessionCaisseResponseDto;
  ticketsEnCours!: TicketEnCoursDto[];
  ventilationPaiements!: {
    methode: string;
    nombre: number;
    total: number;
  }[];
}
