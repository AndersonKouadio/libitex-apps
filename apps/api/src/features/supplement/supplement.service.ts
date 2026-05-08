import { Injectable, NotFoundException } from "@nestjs/common";
import { SupplementRepository } from "./repositories/supplement.repository";
import {
  CreerSupplementDto, ModifierSupplementDto, SupplementResponseDto,
} from "./dto/supplement.dto";

@Injectable()
export class SupplementService {
  constructor(private readonly repo: SupplementRepository) {}

  async creer(tenantId: string, dto: CreerSupplementDto): Promise<SupplementResponseDto> {
    const s = await this.repo.creer({
      tenantId,
      name: dto.nom,
      description: dto.description,
      price: dto.prix.toString(),
      category: dto.categorie,
      image: dto.image,
    });
    return this.toResponse(s);
  }

  async lister(tenantId: string): Promise<SupplementResponseDto[]> {
    const list = await this.repo.lister(tenantId);
    return list.map((s) => this.toResponse(s));
  }

  async obtenir(tenantId: string, id: string): Promise<SupplementResponseDto> {
    const s = await this.repo.trouverParId(tenantId, id);
    if (!s) throw new NotFoundException("Supplément introuvable");
    return this.toResponse(s);
  }

  /** Renvoie les supplements actifs identifies par leurs ids (pour le POS). */
  async listerParIds(tenantId: string, ids: string[]): Promise<SupplementResponseDto[]> {
    const list = await this.repo.listerParIds(tenantId, ids);
    return list.map((s) => this.toResponse(s));
  }

  async modifier(tenantId: string, id: string, dto: ModifierSupplementDto): Promise<SupplementResponseDto> {
    const existant = await this.repo.trouverParId(tenantId, id);
    if (!existant) throw new NotFoundException("Supplément introuvable");

    const updates: Record<string, unknown> = {};
    if (dto.nom !== undefined) updates.name = dto.nom;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.prix !== undefined) updates.price = dto.prix.toString();
    if (dto.categorie !== undefined) updates.category = dto.categorie;
    if (dto.image !== undefined) updates.image = dto.image;
    if (dto.actif !== undefined) updates.isActive = dto.actif;

    const updated = await this.repo.modifier(tenantId, id, updates);
    return this.toResponse(updated);
  }

  async supprimer(tenantId: string, id: string): Promise<void> {
    const existant = await this.repo.trouverParId(tenantId, id);
    if (!existant) throw new NotFoundException("Supplément introuvable");
    await this.repo.supprimer(tenantId, id);
  }

  private toResponse(s: any): SupplementResponseDto {
    return {
      id: s.id,
      nom: s.name,
      description: s.description,
      prix: Number(s.price),
      categorie: s.category,
      image: s.image,
      actif: s.isActive,
      creeLe: s.createdAt?.toISOString?.() ?? s.createdAt,
    };
  }
}
