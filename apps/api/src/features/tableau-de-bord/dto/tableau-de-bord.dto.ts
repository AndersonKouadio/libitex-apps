import { ApiProperty } from "@nestjs/swagger";

export class KpiResponseDto {
  @ApiProperty({ description: "Recettes du jour (total HT + TVA)", example: 158400 })
  recettesJour!: number;

  @ApiProperty({ description: "Nombre de tickets completes du jour", example: 12 })
  ticketsJour!: number;

  @ApiProperty({ description: "Ticket moyen du jour", example: 13200 })
  ticketMoyen!: number;

  @ApiProperty({ description: "Nombre total de produits actifs au catalogue", example: 84 })
  nombreProduits!: number;

  @ApiProperty({ description: "Nombre de points de vente actifs", example: 2 })
  nombreEmplacements!: number;
}

export class PointVentesJourDto {
  @ApiProperty({ description: "Date AAAA-MM-JJ", example: "2026-05-07" })
  date!: string;

  @ApiProperty({ description: "Recettes de la journée", example: 158400 })
  recettes!: number;

  @ApiProperty({ description: "Nombre de tickets", example: 12 })
  nombre!: number;
}

export class TopProduitDto {
  variantId!: string;
  nomProduit!: string;
  nomVariante!: string | null;
  sku!: string;
  quantiteTotale!: number;
  chiffreAffaires!: number;
  nombreVentes!: number;
}

export class RepartitionPaiementDto {
  methode!: string;
  total!: number;
  nombre!: number;
  pourcentage!: number;
}

export class TendanceDto {
  /** Variation en % vs periode precedente (-100 a +inf). null si pas de comparaison possible. */
  variation!: number | null;
  /** Valeur de la periode precedente, pour le tooltip. */
  precedente!: number;
}

export class KpisPeriodeDto {
  recettes!: number;
  tickets!: number;
  ticketMoyen!: number;
  tendanceRecettes!: TendanceDto;
  tendanceTickets!: TendanceDto;
  tendanceTicketMoyen!: TendanceDto;
}
