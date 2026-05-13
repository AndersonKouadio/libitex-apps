import { Injectable, Logger } from "@nestjs/common";
import { AchatRepository } from "../repositories/achat.repository";

export type MethodeAllocation = "QUANTITY" | "WEIGHT" | "VALUE";

/**
 * Phase A.2 : ligne reçue avec ses meta-donnees necessaires pour
 * l'allocation des frais. Le caller (achat.service.receptionner)
 * construit ces objets a partir de la commande + reception courante.
 */
export interface LigneReception {
  lineId: string;
  variantId: string;
  quantiteRecue: number;
  unitPrice: number;
  /** Poids unitaire — requis si methodeAllocation = WEIGHT. */
  poidsUnitaire?: number;
}

/**
 * Phase A.2 : resultat du calcul Landed Cost pour une ligne.
 */
export interface ResultatLandedLigne {
  lineId: string;
  variantId: string;
  quantiteRecue: number;          // re-expose pour le calcul CUMP downstream
  partAllouee: number;            // part proportionnelle [0..1]
  fraisAlloue: number;            // montant frais alloue a cette ligne
  landedUnitCost: number;         // unit_price + frais_par_unite
  landedTotalCost: number;        // landedUnitCost * quantiteRecue
}

@Injectable()
export class LandedCostService {
  private readonly logger = new Logger(LandedCostService.name);

  constructor(private readonly repo: AchatRepository) {}

  /**
   * Phase A.2 : algorithme central de ventilation des frais sur les
   * lignes recues. Pure et deterministe — testable sans I/O.
   *
   * Formule generale :
   *   part_ligne = denominateur_ligne / SUM(denominateurs)
   *   frais_ligne = costs_total * part_ligne
   *   landed_unit = unit_price + (frais_ligne / qty_recue)
   *
   * Selon methode :
   *   QUANTITY -> denominateur = qty_recue
   *   WEIGHT   -> denominateur = qty_recue * poids_unitaire (fallback QTY si poids absents)
   *   VALUE    -> denominateur = qty_recue * unit_price
   *
   * Edge cases :
   * - costs_total = 0 -> landed_unit = unit_price (pas de surcout)
   * - somme denominateurs = 0 (toutes lignes vides) -> ne retourne rien
   * - WEIGHT sans poids -> bascule auto sur QUANTITY + warning log
   */
  calculerLandedCosts(
    lignes: LigneReception[],
    fraisTotal: number,
    methode: MethodeAllocation = "QUANTITY",
  ): ResultatLandedLigne[] {
    if (lignes.length === 0) return [];

    // 1. Calcul des denominateurs par ligne selon la methode
    let methodeEffective = methode;
    let denominateurs = lignes.map((l) => this.calculerDenominateur(l, methodeEffective));

    // Fallback WEIGHT -> QUANTITY si tous les poids sont a 0 (variants sans poids defini)
    if (methodeEffective === "WEIGHT" && denominateurs.every((d) => d === 0)) {
      this.logger.warn(
        "Allocation WEIGHT demandee mais aucun poids defini sur les variants. " +
        "Fallback automatique sur QUANTITY.",
      );
      methodeEffective = "QUANTITY";
      denominateurs = lignes.map((l) => this.calculerDenominateur(l, methodeEffective));
    }

    const sommeDenoms = denominateurs.reduce((s, d) => s + d, 0);

    // 2. Calcul Landed par ligne. Si pas de frais OU pas de denominateur,
    // landed = unit_price.
    return lignes.map((ligne, i) => {
      const denom = denominateurs[i] ?? 0;
      const partAllouee = sommeDenoms > 0 ? denom / sommeDenoms : 0;
      const fraisAlloue = fraisTotal * partAllouee;
      const fraisParUnite = ligne.quantiteRecue > 0 ? fraisAlloue / ligne.quantiteRecue : 0;
      const landedUnitCost = ligne.unitPrice + fraisParUnite;
      const landedTotalCost = landedUnitCost * ligne.quantiteRecue;

      return {
        lineId: ligne.lineId,
        variantId: ligne.variantId,
        quantiteRecue: ligne.quantiteRecue,
        partAllouee: Number(partAllouee.toFixed(6)),
        fraisAlloue: Number(fraisAlloue.toFixed(2)),
        landedUnitCost: Number(landedUnitCost.toFixed(4)),
        landedTotalCost: Number(landedTotalCost.toFixed(2)),
      };
    });
  }

  private calculerDenominateur(ligne: LigneReception, methode: MethodeAllocation): number {
    switch (methode) {
      case "QUANTITY":
        return ligne.quantiteRecue;
      case "WEIGHT":
        return ligne.quantiteRecue * (ligne.poidsUnitaire ?? 0);
      case "VALUE":
        return ligne.quantiteRecue * ligne.unitPrice;
    }
  }

  /**
   * Phase A.2 : calcule le nouveau CUMP a partir du stock existant,
   * du CUMP actuel et de la reception courante.
   *
   * Formule (rappel CdC) :
   *   nouveau_cump = (stock_existant * cump_actuel + qty_recue * landed_unit_cost)
   *                  / (stock_existant + qty_recue)
   *
   * Edge cases :
   * - stock_existant + qty_recue = 0 -> on garde cump_actuel (pas de division)
   * - cump_actuel = 0 (premier achat) -> nouveau_cump = landed_unit_cost
   * - stock_existant negatif (cas degrade post-vente offline) -> on traite
   *   comme 0 pour eviter une moyenne aberrante.
   */
  calculerNouveauCump(
    stockExistant: number,
    cumpActuel: number,
    quantiteRecue: number,
    landedUnitCost: number,
  ): number {
    const stockSafe = Math.max(0, stockExistant);
    const denom = stockSafe + quantiteRecue;
    if (denom <= 0) return cumpActuel;
    const numer = stockSafe * cumpActuel + quantiteRecue * landedUnitCost;
    return Number((numer / denom).toFixed(4));
  }

  /**
   * Phase A.2 : applique en DB les couts debarques calcules + recalcule
   * les CUMP des variants concernes. Atomique au sens "best-effort
   * sequentiel" — chaque update est independant (pas de batch ici car
   * neon-http ne le permet pas).
   *
   * Appele par achat.service.receptionner() apres l'application stock.
   */
  async appliquerLandedEtRecalculerCump(
    tenantId: string,
    resultats: ResultatLandedLigne[],
  ): Promise<void> {
    for (const r of resultats) {
      // 1. Maj landed sur la ligne (cumule sur les receptions partielles
      //    si plusieurs livraisons, geree au niveau service appelant)
      await this.repo.majLandedLigne(
        r.lineId,
        r.landedUnitCost.toFixed(4),
        r.landedTotalCost.toFixed(2),
      );

      // 2. Lire contexte CUMP du variant.
      // Important : `stockExistant` retourne le stock COURANT, qui inclut
      // deja le mouvement STOCK_IN de la reception (event-sourcing). On
      // retranche donc la quantite recue pour obtenir le stockAvantReception
      // utilise dans la formule du CUMP.
      const ctx = await this.repo.obtenirContexteCump(tenantId, r.variantId);
      const stockAvantReception = Math.max(0, ctx.stockExistant - r.quantiteRecue);

      const nouveauCump = this.calculerNouveauCump(
        stockAvantReception,
        ctx.cumpActuel,
        r.quantiteRecue,
        r.landedUnitCost,
      );

      // priceLanded est numeric(15,2) en DB, on arrondit a 2 decimales
      await this.repo.majCump(r.variantId, nouveauCump.toFixed(2));
    }
  }
}
