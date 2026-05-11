import { Injectable, NotFoundException } from "@nestjs/common";
import { ClientRepository } from "./repositories/client.repository";
import {
  CreerClientDto, ModifierClientDto, ClientResponseDto,
  KpisClientDto, HistoriqueClientDto,
} from "./dto/client.dto";
import { PaginatedResponseDto } from "../../common/dto/api-response.dto";

@Injectable()
export class ClientService {
  constructor(private readonly clientRepo: ClientRepository) {}

  async creer(tenantId: string, dto: CreerClientDto): Promise<ClientResponseDto> {
    const client = await this.clientRepo.creer({
      tenantId,
      firstName: dto.prenom,
      lastName: dto.nomFamille,
      phone: dto.telephone,
      email: dto.email,
      address: dto.adresse,
      notes: dto.notes,
    });
    return this.toResponse(client);
  }

  async lister(
    tenantId: string,
    page = 1,
    limit = 50,
    recherche?: string,
  ): Promise<PaginatedResponseDto<ClientResponseDto>> {
    const { data, total } = await this.clientRepo.lister(tenantId, page, limit, recherche);
    return PaginatedResponseDto.create(data.map((c) => this.toResponse(c)), total, page, limit);
  }

  async obtenir(tenantId: string, id: string): Promise<ClientResponseDto> {
    const client = await this.clientRepo.trouverParId(tenantId, id);
    if (!client) throw new NotFoundException("Client introuvable");
    return this.toResponse(client);
  }

  async modifier(tenantId: string, id: string, dto: ModifierClientDto): Promise<ClientResponseDto> {
    const existant = await this.clientRepo.trouverParId(tenantId, id);
    if (!existant) throw new NotFoundException("Client introuvable");

    const updates: Record<string, unknown> = {};
    if (dto.prenom !== undefined) updates.firstName = dto.prenom;
    if (dto.nomFamille !== undefined) updates.lastName = dto.nomFamille;
    if (dto.telephone !== undefined) updates.phone = dto.telephone;
    if (dto.email !== undefined) updates.email = dto.email;
    if (dto.adresse !== undefined) updates.address = dto.adresse;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    const updated = await this.clientRepo.modifier(tenantId, id, updates);
    return this.toResponse(updated);
  }

  async supprimer(tenantId: string, id: string): Promise<void> {
    const existant = await this.clientRepo.trouverParId(tenantId, id);
    if (!existant) throw new NotFoundException("Client introuvable");
    await this.clientRepo.supprimer(tenantId, id);
  }

  async kpis(tenantId: string, clientId: string): Promise<KpisClientDto> {
    const client = await this.clientRepo.trouverParId(tenantId, clientId);
    if (!client) throw new NotFoundException("Client introuvable");

    const k = await this.clientRepo.kpisClient(tenantId, clientId);
    return {
      caTotal: Math.round(k.caTotal),
      nbTickets: k.nbTickets,
      ticketMoyen: k.nbTickets > 0 ? Math.round(k.caTotal / k.nbTickets) : 0,
      premierAchat: k.premierAchat?.toISOString?.() ?? null,
      dernierAchat: k.dernierAchat?.toISOString?.() ?? null,
    };
  }

  async historique(
    tenantId: string, clientId: string, page = 1, pageSize = 25,
  ): Promise<HistoriqueClientDto> {
    const client = await this.clientRepo.trouverParId(tenantId, clientId);
    if (!client) throw new NotFoundException("Client introuvable");

    const { rows, total } = await this.clientRepo.historiqueTickets(tenantId, clientId, page, pageSize);
    return {
      data: rows.map((r) => ({
        id: r.id,
        numeroTicket: r.ticketNumber,
        total: Number(r.total),
        completeLe: r.completedAt?.toISOString?.() ?? null,
        emplacementId: r.locationId,
      })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  private toResponse(c: any): ClientResponseDto {
    return {
      id: c.id,
      prenom: c.firstName,
      nomFamille: c.lastName,
      telephone: c.phone,
      email: c.email,
      adresse: c.address,
      notes: c.notes,
      creeLe: c.createdAt?.toISOString?.() ?? c.createdAt,
    };
  }
}
