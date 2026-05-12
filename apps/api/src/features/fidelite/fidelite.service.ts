import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
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
   * Fix C3 + I2 : verifie que customerId appartient au tenant.
   * Centralise pour utiliser dans toutes les methodes publiques.
   */
  private async assertClientTenant(tenantId: string, customerId: string): Promise<void> {
    const ok = await this.repo.clientAppartientTenant(tenantId, customerId);
    if (!ok) {
      throw new ForbiddenException("Client introuvable ou inaccessible");
    }
  }

  /**
   * Appele par VenteService.completerTicket apres la cloture d'un ticket.
   * Si la fidelite est active et le ticket est attache a un client, calcule
   * et credite les points gagnes. Silencieux si tenant != client ou point=0.
   *
   * Fix C4 : si la transaction existe deja (replay), on degrade
   * silencieusement (idempotence).
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
    try {
      await this.repo.ajouterTransaction({
        tenantId,
        customerId,
        points,
        transactionType: "EARN",
        ticketId,
      });
    } catch (err) {
      if (this.repo.estViolationUniqueLoyalty(err)) return;
      throw err;
    }
  }

  /**
   * Debit/credit lie a un ticket (paiement avec points = REDEEM negatif).
   *
   * Fix I3 : verifie le solde avant le debit pour eviter solde negatif.
   * Fix C4 : idempotent sur (tenant, customer, ticket, REDEEM).
   */
  async ajusterPointsDepuisTicket(
    tenantId: string,
    customerId: string,
    ticketId: string,
    points: number,
  ): Promise<void> {
    if (points === 0) return;
    // Fix I3 : si debit (points < 0), verifie qu'il y a assez sur le solde
    if (points < 0) {
      const solde = await this.repo.solde(tenantId, customerId);
      if (solde + points < 0) {
        throw new BadRequestException(
          `Solde insuffisant : ${solde} points dispos, ${Math.abs(points)} requis`,
        );
      }
    }
    try {
      await this.repo.ajouterTransaction({
        tenantId,
        customerId,
        points,
        transactionType: "REDEEM",
        ticketId,
      });
    } catch (err) {
      if (this.repo.estViolationUniqueLoyalty(err)) return;
      throw err;
    }
  }

  async ajusterPoints(
    tenantId: string,
    userId: string,
    customerId: string,
    dto: AjusterPointsDto,
  ): Promise<void> {
    if (dto.points === 0) throw new BadRequestException("Les points doivent etre differents de zero");
    // Fix C3 : empeche un admin d'ajuster un solde cross-tenant.
    await this.assertClientTenant(tenantId, customerId);
    // Fix I3 : refuse si le debit ferait passer le solde sous zero.
    if (dto.points < 0) {
      const solde = await this.repo.solde(tenantId, customerId);
      if (solde + dto.points < 0) {
        throw new BadRequestException(
          `Ajustement refuse : solde resulterait a ${solde + dto.points} (negatif). Solde courant : ${solde}`,
        );
      }
    }
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
    // Fix C3 : check tenant avant de lire le solde
    await this.assertClientTenant(tenantId, customerId);
    const [solde, config] = await Promise.all([
      this.repo.solde(tenantId, customerId),
      this.repo.obtenirOuCreerConfig(tenantId),
    ]);
    return {
      solde,
      valeurEnFcfa: solde * Number(config.redeemValue),
    };
  }

  async historique(
    tenantId: string,
    customerId: string,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<TransactionFideliteDto[]> {
    // Fix C3 : check tenant avant de lire l'historique
    await this.assertClientTenant(tenantId, customerId);
    const rows = await this.repo.historique(tenantId, customerId, opts);
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
