import {
  Injectable, ForbiddenException, NotFoundException,
} from "@nestjs/common";
import { LocationSettingsRepository } from "./repositories/location-settings.repository";
import {
  ModifierLocationSettingsDto, LocationSettingsResponseDto,
  LocationSettingsEffectifsDto,
} from "./dto/location-settings.dto";

@Injectable()
export class LocationSettingsService {
  constructor(private readonly repo: LocationSettingsRepository) {}

  /**
   * Lit les reglages bruts (overrides only) d'un emplacement. Renvoie des
   * defauts vides si aucun override n'a encore ete configure — la page
   * d'edition affiche ainsi "hériter du tenant" partout.
   */
  async obtenir(tenantId: string, locationId: string): Promise<LocationSettingsResponseDto> {
    const ok = await this.repo.emplacementAppartientTenant(tenantId, locationId);
    if (!ok) throw new ForbiddenException("Emplacement introuvable pour ce tenant");

    const row = await this.repo.trouver(tenantId, locationId);
    if (!row) {
      return {
        locationId,
        taxRateOverride: null,
        paymentMethodsOverride: null,
        ticketFooterMessage: null,
        autoPrintDefault: false,
        preferredPrinterSignature: null,
        notes: null,
      };
    }
    return this.map(row);
  }

  /**
   * Upsert : cree la ligne au premier appel, met a jour ensuite.
   * Cross-tenant guard avant toute ecriture.
   */
  async modifier(
    tenantId: string, locationId: string, dto: ModifierLocationSettingsDto,
  ): Promise<LocationSettingsResponseDto> {
    const ok = await this.repo.emplacementAppartientTenant(tenantId, locationId);
    if (!ok) throw new ForbiddenException("Emplacement introuvable pour ce tenant");

    const row = await this.repo.upsert({
      tenantId, locationId,
      taxRateOverride: dto.taxRateOverride,
      paymentMethodsOverride: dto.paymentMethodsOverride,
      ticketFooterMessage: dto.ticketFooterMessage,
      autoPrintDefault: dto.autoPrintDefault,
      preferredPrinterSignature: dto.preferredPrinterSignature,
      notes: dto.notes,
    });
    return this.map(row);
  }

  /**
   * Module 15 D2 : reglages effectifs (override OU defaut tenant). Utilise
   * par les services applicatifs (vente, ticket, session-caisse).
   *
   * Si la location n'existe pas (id invalide ou cross-tenant), throw
   * NotFoundException. Pas de check tenant explicite ici : la JOIN
   * tenants+locations garantit qu'on retourne null si pas de match
   * tenant/location coherent.
   */
  async obtenirEffectif(
    tenantId: string, locationId: string,
  ): Promise<LocationSettingsEffectifsDto> {
    const row = await this.repo.obtenirEffectif(tenantId, locationId);
    if (!row) throw new NotFoundException("Emplacement introuvable");
    return {
      locationId: row.locationId,
      taxRate: Number(row.taxRate ?? 0),
      paymentMethods: row.paymentMethods ?? ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER"],
      ticketFooterMessage: row.ticketFooterMessage ?? null,
      autoPrintDefault: row.autoPrintDefault ?? false,
      preferredPrinterSignature: row.preferredPrinterSignature ?? null,
    };
  }

  private map(row: any): LocationSettingsResponseDto {
    return {
      locationId: row.locationId,
      taxRateOverride: row.taxRateOverride != null ? Number(row.taxRateOverride) : null,
      paymentMethodsOverride: row.paymentMethodsOverride,
      ticketFooterMessage: row.ticketFooterMessage,
      autoPrintDefault: row.autoPrintDefault,
      preferredPrinterSignature: row.preferredPrinterSignature,
      notes: row.notes,
    };
  }
}
