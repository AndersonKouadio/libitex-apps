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

  @ApiProperty({ description: "Recettes de la journee", example: 158400 })
  recettes!: number;

  @ApiProperty({ description: "Nombre de tickets", example: 12 })
  nombre!: number;
}
