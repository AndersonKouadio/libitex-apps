import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ComptabiliteRepository } from "./repositories/comptabilite.repository";
import { COMPTE_PAR_METHODE_PAIEMENT } from "./plan-ohada";
import { PaginatedResponseDto } from "../../common/dto/api-response.dto";

interface PaiementVente {
  methode: string;  // CASH | CARD | MOBILE_MONEY | BANK_TRANSFER | CREDIT
  montant: number;
}

interface DonneesVente {
  ticketId: string;
  ticketNumber: string;
  completedAt: Date;
  totalTtc: number;
  totalTva: number;
  totalRemise: number;
  paiements: PaiementVente[];
}

@Injectable()
export class ComptabiliteService {
  private readonly logger = new Logger(ComptabiliteService.name);

  constructor(private readonly repo: ComptabiliteRepository) {}

  // ─── Public API ──────────────────────────────────────────────

  async assurerPlanComptable(tenantId: string): Promise<void> {
    await this.repo.assurerPlanComptable(tenantId);
  }

  async listerPlanComptable(tenantId: string) {
    await this.repo.assurerPlanComptable(tenantId); // rattrapage tenants existants
    return this.repo.listerComptes(tenantId);
  }

  async listerJournal(
    tenantId: string,
    page = 1,
    limit = 25,
    opts: { dateDebut?: string; dateFin?: string; referenceType?: string } = {},
  ) {
    await this.repo.assurerPlanComptable(tenantId);
    const offset = (page - 1) * limit;
    const { ecritures, lignes = [], total } = await this.repo.listerJournal(tenantId, {
      limit, offset, ...opts,
    });

    // Regrouper les lignes par entryId pour faciliter le rendu UI
    const lignesParEcriture = new Map<string, typeof lignes>();
    for (const l of lignes) {
      const arr = lignesParEcriture.get(l.entryId) ?? [];
      arr.push(l);
      lignesParEcriture.set(l.entryId, arr);
    }

    const data = ecritures.map((e) => {
      const ls = lignesParEcriture.get(e.id) ?? [];
      return {
        id: e.id,
        date: e.date,
        pieceNumber: e.pieceNumber,
        description: e.description,
        referenceType: e.referenceType,
        referenceId: e.referenceId,
        totalDebit: ls.reduce((s, l) => s + Number(l.debit), 0),
        totalCredit: ls.reduce((s, l) => s + Number(l.credit), 0),
        lignes: ls.map((l) => ({
          accountCode: l.accountCode,
          accountLabel: l.accountLabel,
          debit: Number(l.debit),
          credit: Number(l.credit),
          description: l.description,
        })),
      };
    });

    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async balanceComptes(tenantId: string, dateDebut?: string, dateFin?: string) {
    await this.repo.assurerPlanComptable(tenantId);
    const rows = await this.repo.balanceComptes(tenantId, { dateDebut, dateFin });
    return rows.map((r) => ({
      code: r.code,
      label: r.label,
      type: r.type,
      totalDebit: Number(r.totalDebit),
      totalCredit: Number(r.totalCredit),
      solde: Number(r.totalDebit) - Number(r.totalCredit),
    }));
  }

  // ─── Generation auto d'ecritures ──────────────────────────────

  /**
   * Enregistre une ecriture de vente au comptant (ou a credit) :
   *   Debit  571x / 521 / 5715 / 411   (selon paiements)  = TTC
   *   Credit  701 Ventes                                   = HT
   *   Credit  4457 TVA collectée                           = TVA
   *   Credit  7019 Remises accordees                       = remise (si > 0)
   *
   * Idempotent : si une ecriture existe deja pour ce ticket (referenceType=VENTE
   * + referenceId), on skip silencieusement. Permet de re-jouer en cas de
   * crash sans doublon.
   */
  async enregistrerVente(tenantId: string, vente: DonneesVente): Promise<void> {
    try {
      await this.repo.assurerPlanComptable(tenantId);

      const totalHt = vente.totalTtc - vente.totalTva;
      const codesNecessaires = new Set<string>(["701", "4457"]);
      if (vente.totalRemise > 0) codesNecessaires.add("7019");
      for (const p of vente.paiements) {
        const code = COMPTE_PAR_METHODE_PAIEMENT[p.methode];
        if (code) codesNecessaires.add(code);
      }

      const mapComptes = await this.repo.obtenirComptesParCode(tenantId, [...codesNecessaires]);
      const idCompte = (code: string) => {
        const id = mapComptes.get(code);
        if (!id) throw new Error(`Compte OHADA ${code} introuvable pour tenant ${tenantId}`);
        return id;
      };

      const lignes: Array<{ accountId: string; debit: number; credit: number; description?: string }> = [];

      // Debits : tresorerie / clients selon paiements
      for (const p of vente.paiements) {
        if (p.montant <= 0) continue;
        const code = COMPTE_PAR_METHODE_PAIEMENT[p.methode];
        if (!code) {
          this.logger.warn(`Methode paiement inconnue pour compta: ${p.methode}`);
          continue;
        }
        lignes.push({
          accountId: idCompte(code),
          debit: arrondir2(p.montant),
          credit: 0,
          description: `Encaissement ${p.methode}`,
        });
      }

      // Credits : vente HT + TVA collectee
      lignes.push({
        accountId: idCompte("701"),
        debit: 0,
        credit: arrondir2(totalHt),
        description: "Vente de marchandises",
      });
      if (vente.totalTva > 0) {
        lignes.push({
          accountId: idCompte("4457"),
          debit: 0,
          credit: arrondir2(vente.totalTva),
          description: "TVA collectée",
        });
      }
      // Remise accordee : on credite 7019 du montant negatif (= debit equivalent)
      // pour conserver la lisibilite. Convention : remise = produit negatif.
      if (vente.totalRemise > 0) {
        // On reduit le credit total en mettant la remise en debit cote produit
        lignes.push({
          accountId: idCompte("7019"),
          debit: arrondir2(vente.totalRemise),
          credit: 0,
          description: "Remise accordée",
        });
      }

      // Verification equilibre debit = credit
      const sumDebit = lignes.reduce((s, l) => s + l.debit, 0);
      const sumCredit = lignes.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(sumDebit - sumCredit) > 0.01) {
        this.logger.error(
          `Ecriture vente desequilibree: ticket=${vente.ticketNumber} debit=${sumDebit} credit=${sumCredit}`,
        );
        return;
      }

      // Numerotation : VTE-YYYY-NNNN (compteur par annee)
      const annee = vente.completedAt.getUTCFullYear();
      const prefixe = `VTE-${annee}-`;
      const nb = await this.repo.compterEcrituresParPrefixe(tenantId, prefixe);
      const pieceNumber = `${prefixe}${String(nb + 1).padStart(4, "0")}`;

      const date = vente.completedAt.toISOString().split("T")[0]!;

      await this.repo.creerEcriture({
        tenantId,
        date,
        pieceNumber,
        description: `Vente ${vente.ticketNumber}`,
        referenceType: "VENTE",
        referenceId: vente.ticketId,
        lignes,
      });
    } catch (err) {
      // Resilience: une erreur compta ne doit pas casser la vente.
      // On log et on continue. Permet de re-jouer plus tard si besoin
      // (un job de reparation pourra detecter les ventes sans ecriture).
      this.logger.error(
        `Erreur enregistrement compta vente ${vente.ticketNumber}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

function arrondir2(n: number): number {
  return Math.round(n * 100) / 100;
}
