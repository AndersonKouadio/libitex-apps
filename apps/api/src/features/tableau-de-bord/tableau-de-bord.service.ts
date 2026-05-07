import { Injectable } from "@nestjs/common";
import { TableauDeBordRepository } from "./repositories/tableau-de-bord.repository";
import { KpiResponseDto, PointVentesJourDto } from "./dto/tableau-de-bord.dto";

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
}
