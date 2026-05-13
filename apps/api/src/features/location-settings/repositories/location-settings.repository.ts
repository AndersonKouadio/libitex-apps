import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import { type Database, locationSettings, tenants, locations } from "@libitex/db";

@Injectable()
export class LocationSettingsRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  /**
   * Retourne les reglages bruts (overrides only) d'un emplacement.
   * null si pas encore configure.
   */
  async trouver(tenantId: string, locationId: string) {
    const [row] = await this.db
      .select()
      .from(locationSettings)
      .where(and(
        eq(locationSettings.tenantId, tenantId),
        eq(locationSettings.locationId, locationId),
      ))
      .limit(1);
    return row;
  }

  /**
   * Verifie qu'un emplacement appartient au tenant. Cross-tenant guard
   * comme dans Module 12.
   */
  async emplacementAppartientTenant(tenantId: string, locationId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, locationId), eq(locations.tenantId, tenantId)))
      .limit(1);
    return !!row;
  }

  /**
   * Upsert atomique : INSERT si pas de ligne, UPDATE sinon. Postgres
   * supporte ON CONFLICT sur uq_location_settings_location. Les champs
   * non specifies dans `set` conservent leur valeur existante.
   */
  async upsert(data: {
    tenantId: string;
    locationId: string;
    taxRateOverride?: number | null;
    paymentMethodsOverride?: Array<"CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CREDIT"> | null;
    ticketFooterMessage?: string | null;
    autoPrintDefault?: boolean;
    preferredPrinterSignature?: string | null;
    notes?: string | null;
  }) {
    // Construction du set conditionnel — on n'ecrase pas un champ avec undefined
    const valuesPourInsert: any = {
      tenantId: data.tenantId,
      locationId: data.locationId,
      taxRateOverride: data.taxRateOverride != null ? String(data.taxRateOverride) : null,
      paymentMethodsOverride: data.paymentMethodsOverride ?? null,
      ticketFooterMessage: data.ticketFooterMessage ?? null,
      autoPrintDefault: data.autoPrintDefault ?? false,
      preferredPrinterSignature: data.preferredPrinterSignature ?? null,
      notes: data.notes ?? null,
    };

    const setPourUpdate: any = { updatedAt: new Date() };
    if (data.taxRateOverride !== undefined) {
      setPourUpdate.taxRateOverride = data.taxRateOverride != null
        ? String(data.taxRateOverride) : null;
    }
    if (data.paymentMethodsOverride !== undefined) {
      setPourUpdate.paymentMethodsOverride = data.paymentMethodsOverride;
    }
    if (data.ticketFooterMessage !== undefined) {
      setPourUpdate.ticketFooterMessage = data.ticketFooterMessage;
    }
    if (data.autoPrintDefault !== undefined) {
      setPourUpdate.autoPrintDefault = data.autoPrintDefault;
    }
    if (data.preferredPrinterSignature !== undefined) {
      setPourUpdate.preferredPrinterSignature = data.preferredPrinterSignature;
    }
    if (data.notes !== undefined) {
      setPourUpdate.notes = data.notes;
    }

    const [row] = await this.db
      .insert(locationSettings)
      .values(valuesPourInsert)
      .onConflictDoUpdate({
        target: locationSettings.locationId,
        set: setPourUpdate,
      })
      .returning();
    return row;
  }

  /**
   * Module 15 D2 : recupere les reglages effectifs (merge tenant + override)
   * en une seule query. Utilise par les services applicatifs (vente,
   * session-caisse) qui ont besoin du resultat final.
   */
  async obtenirEffectif(tenantId: string, locationId: string) {
    const [row] = await this.db
      .select({
        locationId: locations.id,
        // Override location si defini, sinon defaut tenant
        taxRate: sql<string>`
          COALESCE(${locationSettings.taxRateOverride}::text, ${tenants.taxRate}, '0')
        `,
        paymentMethods: sql<Array<"CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CREDIT">>`
          COALESCE(
            ${locationSettings.paymentMethodsOverride},
            ${tenants.paymentMethods},
            '["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER"]'::jsonb
          )
        `,
        ticketFooterMessage: locationSettings.ticketFooterMessage,
        autoPrintDefault: locationSettings.autoPrintDefault,
        preferredPrinterSignature: locationSettings.preferredPrinterSignature,
      })
      .from(locations)
      .innerJoin(tenants, eq(locations.tenantId, tenants.id))
      .leftJoin(locationSettings, eq(locationSettings.locationId, locations.id))
      .where(and(
        eq(locations.id, locationId),
        eq(locations.tenantId, tenantId),
      ))
      .limit(1);
    return row;
  }
}
