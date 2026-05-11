import { Injectable } from "@nestjs/common";
import { TableauDeBordRepository } from "./repositories/tableau-de-bord.repository";
import {
  KpiResponseDto, PointVentesJourDto, TopProduitDto, RepartitionPaiementDto,
  KpisPeriodeDto, TendanceDto,
} from "./dto/tableau-de-bord.dto";

function variation(actuel: number, precedent: number): number | null {
  if (precedent === 0) return actuel === 0 ? 0 : null;
  return ((actuel - precedent) / precedent) * 100;
}

@Injectable()
export class TableauDeBordService {
  constructor(private readonly repo: TableauDeBordRepository) {}

  async kpis(tenantId: string): Promise<KpiResponseDto> {
    const dateJour = new Date().toISOString().split("T")[0]!;

    const [resume, nombreProduits, nombreEmplacements] = await Promise.all([
      this.repo.resumeJour(tenantId, dateJour),
      this.repo.compterProduitsActifs(tenantId),
      this.repo.compterEmplacements(tenantId),
    ]);

    const ticketMoyen = resume.nombre > 0 ? resume.recettes / resume.nombre : 0;

    return {
      recettesJour: Math.round(resume.recettes),
      ticketsJour: resume.nombre,
      ticketMoyen: Math.round(ticketMoyen),
      nombreProduits,
      nombreEmplacements,
    };
  }

  async ventesParJour(tenantId: string, jours = 7): Promise<PointVentesJourDto[]> {
    return this.repo.ventesParJour(tenantId, jours);
  }

  async topProduits(tenantId: string, jours = 7, limit = 10): Promise<TopProduitDto[]> {
    const rows = await this.repo.topProduits(tenantId, jours, limit);
    return rows.map((r) => ({
      variantId: r.variantId,
      nomProduit: r.nomProduit,
      nomVariante: r.nomVariante,
      sku: r.sku,
      quantiteTotale: Number(r.quantiteTotale),
      chiffreAffaires: Math.round(Number(r.chiffreAffaires)),
      nombreVentes: Number(r.nombreVentes),
    }));
  }

  async repartitionPaiements(tenantId: string, jours = 7): Promise<RepartitionPaiementDto[]> {
    const rows = await this.repo.repartitionPaiements(tenantId, jours);
    const totalGeneral = rows.reduce((acc, r) => acc + Number(r.total), 0);
    return rows
      .map((r) => ({
        methode: r.methode,
        total: Math.round(Number(r.total)),
        nombre: Number(r.nombre),
        pourcentage: totalGeneral > 0 ? Math.round((Number(r.total) / totalGeneral) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  /**
   * KPIs sur une periode avec comparaison vs periode precedente equivalente.
   * Ex: jours=7 → semaine en cours vs semaine d'avant.
   */
  async kpisPeriode(tenantId: string, jours = 7): Promise<KpisPeriodeDto> {
    const [actuel, precedent] = await Promise.all([
      this.repo.resumePeriode(tenantId, jours, 0),
      this.repo.resumePeriode(tenantId, jours, jours),
    ]);
    const ticketMoyenActuel = actuel.nombre > 0 ? actuel.recettes / actuel.nombre : 0;
    const ticketMoyenPrec = precedent.nombre > 0 ? precedent.recettes / precedent.nombre : 0;

    const tendance = (a: number, p: number): TendanceDto => ({
      variation: variation(a, p),
      precedente: Math.round(p),
    });

    return {
      recettes: Math.round(actuel.recettes),
      tickets: actuel.nombre,
      ticketMoyen: Math.round(ticketMoyenActuel),
      tendanceRecettes: tendance(actuel.recettes, precedent.recettes),
      tendanceTickets: tendance(actuel.nombre, precedent.nombre),
      tendanceTicketMoyen: tendance(ticketMoyenActuel, ticketMoyenPrec),
    };
  }
}
