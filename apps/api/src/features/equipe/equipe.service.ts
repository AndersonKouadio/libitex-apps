import {
  Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { UtilisateurRepository } from "../auth/repositories/utilisateur.repository";
import { MembershipRepository } from "../auth/repositories/membership.repository";
import {
  InviterMembreDto, ModifierMembreDto, MembreResponseDto, InvitationResponseDto,
} from "./dto/equipe.dto";

function genererMotDePasseTemporaire(): string {
  // 10 caracteres alphanumeriques lisibles
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  const bytes = randomBytes(10);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += chars[bytes[i]! % chars.length];
  }
  return out;
}

@Injectable()
export class EquipeService {
  constructor(
    private readonly utilisateurRepo: UtilisateurRepository,
    private readonly membershipRepo: MembershipRepository,
  ) {}

  async lister(tenantId: string): Promise<MembreResponseDto[]> {
    const list = await this.membershipRepo.listerParTenant(tenantId);
    return list.map(({ membership, user }) => this.toResponse(membership, user));
  }

  async inviter(tenantId: string, dto: InviterMembreDto): Promise<InvitationResponseDto> {
    if (dto.role === "ADMIN" && !dto.accessAllLocations) {
      throw new BadRequestException("Un ADMIN doit avoir acces a tous les emplacements");
    }
    if (!dto.accessAllLocations && (!dto.locationIds || dto.locationIds.length === 0)) {
      throw new BadRequestException("Selectionnez au moins un emplacement ou cochez Tous");
    }

    let user = await this.utilisateurRepo.trouverParEmail(dto.email);
    let motDePasseTemporaire = "";

    if (user) {
      // L'utilisateur existe deja: verifier qu'il n'est pas deja membre
      const existant = await this.membershipRepo.trouver(user.id, tenantId);
      if (existant) {
        throw new ConflictException("Cet utilisateur est deja membre de la boutique");
      }
    } else {
      // Creer le user avec un mot de passe temporaire
      motDePasseTemporaire = genererMotDePasseTemporaire();
      const hash = await bcrypt.hash(motDePasseTemporaire, 12);
      user = await this.utilisateurRepo.creerUtilisateur({
        email: dto.email,
        passwordHash: hash,
        firstName: dto.prenom,
        lastName: dto.nomFamille,
        phone: dto.telephone,
        role: dto.role,
      });
    }

    const membership = await this.membershipRepo.creer({
      userId: user.id,
      tenantId,
      role: dto.role,
      isOwner: false,
      accessAllLocations: dto.accessAllLocations,
      locationIds: dto.accessAllLocations ? [] : (dto.locationIds ?? []),
    });

    return {
      membre: this.toResponse(membership, user),
      motDePasseTemporaire,
      message: motDePasseTemporaire
        ? `Compte cree. Communiquez ce mot de passe temporaire a ${dto.prenom}: ${motDePasseTemporaire}`
        : `${dto.prenom} a ete ajoute a la boutique avec son compte existant`,
    };
  }

  async modifier(
    tenantId: string,
    membershipId: string,
    dto: ModifierMembreDto,
  ): Promise<MembreResponseDto> {
    const cible = await this.membershipRepo.trouverParId(membershipId, tenantId);
    if (!cible) throw new NotFoundException("Membre introuvable");

    if (cible.isOwner && dto.role && dto.role !== "ADMIN") {
      throw new ForbiddenException("Le proprietaire de la boutique doit rester ADMIN");
    }

    // Si on retire le statut ADMIN, verifier qu'il reste au moins un autre ADMIN
    if (cible.role === "ADMIN" && dto.role && dto.role !== "ADMIN") {
      const nbAdmins = await this.membershipRepo.compterAdminsActifs(tenantId);
      if (nbAdmins <= 1) {
        throw new BadRequestException("Impossible: il doit rester au moins un ADMIN");
      }
    }

    const updates: Record<string, unknown> = {};
    if (dto.role !== undefined) updates.role = dto.role;
    if (dto.accessAllLocations !== undefined) {
      updates.accessAllLocations = dto.accessAllLocations;
      if (dto.accessAllLocations) updates.locationIds = [];
    }
    if (dto.locationIds !== undefined && !dto.accessAllLocations) {
      updates.locationIds = dto.locationIds;
    }

    const m = await this.membershipRepo.modifier(membershipId, tenantId, updates);
    if (!m) throw new NotFoundException("Membre introuvable");

    const user = await this.utilisateurRepo.trouverParId(m.userId);
    if (!user) throw new NotFoundException("Utilisateur introuvable");

    return this.toResponse(m, user);
  }

  async retirer(tenantId: string, membershipId: string): Promise<void> {
    const cible = await this.membershipRepo.trouverParId(membershipId, tenantId);
    if (!cible) throw new NotFoundException("Membre introuvable");

    if (cible.isOwner) {
      throw new ForbiddenException("Le proprietaire de la boutique ne peut pas etre retire");
    }

    if (cible.role === "ADMIN") {
      const nbAdmins = await this.membershipRepo.compterAdminsActifs(tenantId);
      if (nbAdmins <= 1) {
        throw new BadRequestException("Impossible: il doit rester au moins un ADMIN");
      }
    }

    await this.membershipRepo.modifier(membershipId, tenantId, { isActive: false });
  }

  // --- Helpers ---

  private toResponse(membership: any, user: any): MembreResponseDto {
    return {
      membershipId: membership.id,
      userId: user.id,
      email: user.email,
      prenom: user.firstName,
      nomFamille: user.lastName,
      telephone: user.phone,
      role: membership.role,
      isOwner: membership.isOwner ?? false,
      accessAllLocations: membership.accessAllLocations ?? true,
      locationIds: Array.isArray(membership.locationIds) ? membership.locationIds : [],
      isActive: membership.isActive ?? true,
      invitedAt: membership.invitedAt?.toISOString?.() ?? null,
      acceptedAt: membership.acceptedAt?.toISOString?.() ?? null,
      derniereConnexion: user.lastLoginAt?.toISOString?.() ?? null,
    };
  }
}
