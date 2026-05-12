import { Injectable, BadRequestException } from "@nestjs/common";
import { FideliteRepository } from "./repositories/fidelite.repository";
import {
  ModifierConfigFideliteDto, ConfigFideliteResponseDto,
  AjusterPointsDto, SoldeFideliteDto, TransactionFideliteDto,
} from "./dto/fidelite.dto";

@Injectable()
export class FideliteService {
  constructor(private readonly repo: FideliteRepository) {}

  async obtenirConfig(tenantId: string): Promise<ConfigFideliteResponseDto> {
    const row = await this.repo.obtenirOuCreerConfig(tenantId);
    return this.mapConfig(row);
  }

  async modifierConfig(
    tenantId: string,
    dto: ModifierConfigFideliteDto,
  ): Promise<ConfigFideliteResponseDto> {
    const data: any = {};
    if (dto.actif !== undefined) data.isActive = dto.actif;
    if (dto.nomProgramme !== undefined) data.programName = dto.nomProgramme;
    if (dto.ratioGain !== undefined) data.earnAmount = dto.ratioGain.toString();
    if (dto.valeurPoint !== undefined) data.redeemValue = dto.valeurPoint.toString();
    if (dto.seuilUtilisation !== undefined) data.minRedeemPoints = dto.seuilUtilisation;
    const row = await this.repo.modifierConfig(tenantId, data);
    return this.mapConfig(row);
  }

  private mapConfig(row: any): ConfigFideliteResponseDto {
    return {
      actif: row.isActive,
      nomProgramme: row.programName,
      ratioGain: Number(row.earnAmount),
      valeurPoint: Number(row.redeemValue),
      seuilUtilisation: Number(row.minRedeemPoints),
    };
  }

  /**
   * Appele par VenteService.completerTicket apres la cloture d'un ticket.
   * Si la fidelite est active et le ticket est attache a un client, calcule
   * et credite les points gagnes. Silencieux sinon (pas d'exception).
   */
  async crediterDepuisTicket(
    tenantId: string,
    customerId: string,
    ticketId: string,
    montantTotal: number,
  ): Promise<void> {
    const config = await this.repo.obtenirOuCreerConfig(tenantId);
    if (!config.isActive) return;
    const ratio = Number(config.earnAmount);
    if (ratio <= 0) return;
    const points = Math.floor(montantTotal / ratio);
    if (points <= 0) return;
    await this.repo.ajouterTransaction({
      tenantId,
      customerId,
      points,
      transactionType: "EARN",
      ticketId,
    });
  }

  /**
   * Debit/credit lie a un ticket (paiement avec points = REDEEM negatif).
   * Pas d'exception : best-effort cote VenteService.
   */
  async ajusterPointsDepuisTicket(
    tenantId: string,
    customerId: string,
    ticketId: string,
    points: number,
  ): Promise<void> {
    if (points === 0) return;
    await this.repo.ajouterTransaction({
      tenantId,
      customerId,
      points,
      transactionType: "REDEEM",
      ticketId,
    });
  }

  async ajusterPoints(
    tenantId: string,
    userId: string,
    customerId: string,
    dto: AjusterPointsDto,
  ): Promise<void> {
    if (dto.points === 0) throw new BadRequestException("Les points doivent etre differents de zero");
    await this.repo.ajouterTransaction({
      tenantId,
      customerId,
      points: dto.points,
      transactionType: "ADJUST",
      userId,
      note: dto.note,
    });
  }

  async solde(tenantId: string, customerId: string): Promise<SoldeFideliteDto> {
    const [solde, config] = await Promise.all([
      this.repo.solde(tenantId, customerId),
      this.repo.obtenirOuCreerConfig(tenantId),
    ]);
    return {
      solde,
      valeurEnFcfa: solde * Number(config.redeemValue),
    };
  }

  async historique(tenantId: string, customerId: string): Promise<TransactionFideliteDto[]> {
    const rows = await this.repo.historique(tenantId, customerId);
    return rows.map((r) => ({
      id: r.id,
      points: r.points,
      type: r.transactionType,
      ticketId: r.ticketId,
      ticketNumero: r.ticketNumber ?? null,
      note: r.note ?? null,
      creeLe: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  }
}
