import { Injectable, NotFoundException } from "@nestjs/common";
import { ClientRepository } from "./repositories/client.repository";
import {
  CreerClientDto, ModifierClientDto, ClientResponseDto,
  KpisClientDto, HistoriqueClientDto, SegmentClient,
} from "./dto/client.dto";
import { PaginatedResponseDto } from "../../common/dto/api-response.dto";

const SEUIL_CA_VIP = 100_000; // F CFA
const SEUIL_TICKETS_REGULIER_30J = 3;
const SEUIL_INACTIF_JOURS = 60;

/**
 * Calcule le segment d'un client a partir de ses agregats. Ordre de priorite :
 * NOUVEAU (0 achat) > VIP (CA >= seuil) > REGULIER (>= 3 tickets / 30j)
 * > INACTIF (dernier achat > 60j) > OCCASIONNEL.
 */
function calculerSegment(
  nbTickets: number,
  caTotal: number,
  nbTickets30j: number,
  dernierAchat: Date | null,
): SegmentClient {
  if (nbTickets === 0) return "NOUVEAU";
  if (caTotal >= SEUIL_CA_VIP) return "VIP";
  if (nbTickets30j >= SEUIL_TICKETS_REGULIER_30J) return "REGULIER";
  if (dernierAchat) {
    const jours = (Date.now() - dernierAchat.getTime()) / 86_400_000;
    if (jours > SEUIL_INACTIF_JOURS) return "INACTIF";
  }
  return "OCCASIONNEL";
}

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
      whatsappOptIn: dto.whatsappOptIn,
    });
    return this.toResponse(client);
  }

  async lister(
    tenantId: string,
    page = 1,
    limit = 50,
    recherche?: string,
    segment?: SegmentClient,
  ): Promise<PaginatedResponseDto<ClientResponseDto>> {
    const { data, total } = await this.clientRepo.lister(tenantId, page, limit, recherche);
    let enrichis = data.map((c) => {
      const nbTickets = Number(c.nbTickets ?? 0);
      const caTotal = Number(c.caTotal ?? 0);
      const nbTickets30j = Number(c.nbTickets30j ?? 0);
      const dernierAchat = c.dernierAchat ?? null;
      return {
        ...this.toResponse(c),
        segment: calculerSegment(nbTickets, caTotal, nbTickets30j, dernierAchat),
        caTotal: Math.round(caTotal),
        nbTickets,
        dernierAchat: dernierAchat?.toISOString?.() ?? null,
      };
    });
    if (segment) {
      enrichis = enrichis.filter((c) => c.segment === segment);
    }
    // Si filtre segment, on recalcule le total post-filtre. Sinon le total
    // DB est juste (segments calcules cote API mais pas filtres cote SQL).
    const totalEffectif = segment ? enrichis.length : total;
    return PaginatedResponseDto.create(enrichis, totalEffectif, page, limit);
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
    if (dto.whatsappOptIn !== undefined) updates.whatsappOptIn = dto.whatsappOptIn;

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
      segment: calculerSegment(k.nbTickets, k.caTotal, k.nbTickets30j, k.dernierAchat),
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
      whatsappOptIn: c.whatsappOptIn ?? true,
      creeLe: c.createdAt?.toISOString?.() ?? c.createdAt,
    };
  }
}
