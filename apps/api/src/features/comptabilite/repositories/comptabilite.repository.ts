import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, desc, gte, lte, inArray } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../../database/database.module";
import {
  type Database, accounts, journalEntries, journalLines,
} from "@libitex/db";
import { PLAN_COMPTABLE_OHADA, type CompteOhada } from "../plan-ohada";

@Injectable()
export class ComptabiliteRepository {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  /**
   * Assure que le plan comptable OHADA est seede pour le tenant.
   * Idempotent : INSERT ... ON CONFLICT DO NOTHING (via verification prealable).
   * Appele :
   *  - A la creation d'une boutique (inscription)
   *  - Au 1er acces a la page comptabilite (rattrapage pour tenants existants)
   *  - Avant chaque ecriture (defensive — coute 1 SELECT)
   */
  async assurerPlanComptable(tenantId: string): Promise<void> {
    const existants = await this.db
      .select({ code: accounts.code })
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId));
    const setExistants = new Set(existants.map((r) => r.code));
    const aCreer = PLAN_COMPTABLE_OHADA.filter((c) => !setExistants.has(c.code));
    if (aCreer.length === 0) return;
    await this.db.insert(accounts).values(
      aCreer.map((c) => ({ tenantId, code: c.code, label: c.label, type: c.type })),
    );
  }

  /** Retourne tous les comptes du tenant (plan comptable). */
  async listerComptes(tenantId: string) {
    return this.db
      .select()
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId))
      .orderBy(accounts.code);
  }

  /** Recupere les ids des comptes par code (utilise pour les ecritures). */
  async obtenirComptesParCode(tenantId: string, codes: string[]): Promise<Map<string, string>> {
    if (codes.length === 0) return new Map();
    const rows = await this.db
      .select({ id: accounts.id, code: accounts.code })
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), inArray(accounts.code, codes)));
    return new Map(rows.map((r) => [r.code, r.id]));
  }

  /**
   * Cree une ecriture comptable avec ses lignes. La somme debit doit egaler
   * la somme credit (verifie par la couche service avant appel).
   */
  async creerEcriture(data: {
    tenantId: string;
    date: string; // YYYY-MM-DD
    pieceNumber: string;
    description: string;
    referenceType?: string;
    referenceId?: string;
    lignes: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description?: string;
    }>;
  }) {
    const [entry] = await this.db
      .insert(journalEntries)
      .values({
        tenantId: data.tenantId,
        date: data.date,
        pieceNumber: data.pieceNumber,
        description: data.description,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
      })
      .returning();
    if (!entry) throw new Error("Failed to create journal entry");

    await this.db.insert(journalLines).values(
      data.lignes.map((l) => ({
        entryId: entry.id,
        accountId: l.accountId,
        debit: l.debit.toFixed(2),
        credit: l.credit.toFixed(2),
        description: l.description,
      })),
    );

    return entry;
  }

  /**
   * Compte les ecritures du tenant pour un type donne (pour numerotation).
   * Ex: ecrituresExistantesParType(tenantId, "VTE-2026") -> 42
   */
  async compterEcrituresParPrefixe(tenantId: string, prefix: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(journalEntries)
      .where(and(
        eq(journalEntries.tenantId, tenantId),
        sql`${journalEntries.pieceNumber} LIKE ${prefix + "%"}`,
      ));
    return Number(row?.n ?? 0);
  }

  /**
   * Liste paginee du journal avec jointures pour afficher code+libelle compte.
   * Retourne les ecritures groupees par entryId cote service.
   */
  async listerJournal(
    tenantId: string,
    opts: { limit: number; offset: number; dateDebut?: string; dateFin?: string; referenceType?: string },
  ) {
    const conditions: any[] = [eq(journalEntries.tenantId, tenantId)];
    if (opts.dateDebut) conditions.push(gte(journalEntries.date, opts.dateDebut));
    if (opts.dateFin) conditions.push(lte(journalEntries.date, opts.dateFin));
    if (opts.referenceType) conditions.push(eq(journalEntries.referenceType, opts.referenceType));
    const where = and(...conditions);

    const [countRow] = await this.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(journalEntries)
      .where(where);

    const ecritures = await this.db
      .select()
      .from(journalEntries)
      .where(where)
      .orderBy(desc(journalEntries.date), desc(journalEntries.createdAt))
      .limit(opts.limit)
      .offset(opts.offset);

    if (ecritures.length === 0) {
      return { ecritures: [], total: Number(countRow?.total ?? 0) };
    }

    const entryIds = ecritures.map((e) => e.id);
    const lignes = await this.db
      .select({
        entryId: journalLines.entryId,
        accountCode: accounts.code,
        accountLabel: accounts.label,
        debit: journalLines.debit,
        credit: journalLines.credit,
        description: journalLines.description,
      })
      .from(journalLines)
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(inArray(journalLines.entryId, entryIds));

    return { ecritures, lignes, total: Number(countRow?.total ?? 0) };
  }

  /**
   * Balance des comptes : somme debits/credits par compte sur une periode.
   * Solde = debit - credit (positif pour comptes d'actif/charge, negatif
   * pour passif/produit selon convention).
   */
  async balanceComptes(tenantId: string, opts: { dateDebut?: string; dateFin?: string } = {}) {
    const conditions: any[] = [eq(journalEntries.tenantId, tenantId)];
    if (opts.dateDebut) conditions.push(gte(journalEntries.date, opts.dateDebut));
    if (opts.dateFin) conditions.push(lte(journalEntries.date, opts.dateFin));

    return this.db
      .select({
        accountId: accounts.id,
        code: accounts.code,
        label: accounts.label,
        type: accounts.type,
        totalDebit: sql<number>`COALESCE(SUM(CAST(${journalLines.debit} AS NUMERIC)), 0)`,
        totalCredit: sql<number>`COALESCE(SUM(CAST(${journalLines.credit} AS NUMERIC)), 0)`,
      })
      .from(accounts)
      .leftJoin(journalLines, eq(journalLines.accountId, accounts.id))
      .leftJoin(journalEntries, eq(journalLines.entryId, journalEntries.id))
      .where(and(eq(accounts.tenantId, tenantId), ...(conditions.slice(1) as any)))
      .groupBy(accounts.id, accounts.code, accounts.label, accounts.type)
      .orderBy(accounts.code);
  }
}
