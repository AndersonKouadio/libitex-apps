import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { ActivitySector, ProductType } from "@libitex/shared";
import { UtilisateurRepository } from "../auth/repositories/utilisateur.repository";
import { MembershipRepository } from "../auth/repositories/membership.repository";
import { BoutiqueDetailDto, ModifierBoutiqueDto } from "./dto/boutique.dto";

@Injectable()
export class BoutiqueService {
  constructor(
    private readonly utilisateurRepo: UtilisateurRepository,
    private readonly membershipRepo: MembershipRepository,
  ) {}

  async obtenirBoutiqueActive(tenantId: string): Promise<BoutiqueDetailDto> {
    const tenant = await this.utilisateurRepo.trouverTenantParId(tenantId);
    if (!tenant) throw new NotFoundException("Boutique introuvable");
    return this.toDetail(tenant);
  }

  async modifierBoutique(
    userId: string,
    tenantId: string,
    dto: ModifierBoutiqueDto,
  ): Promise<BoutiqueDetailDto> {
    const tenant = await this.utilisateurRepo.trouverTenantParId(tenantId);
    if (!tenant) throw new NotFoundException("Boutique introuvable");

    const membership = await this.membershipRepo.trouver(userId, tenantId);
    if (!membership) throw new ForbiddenException("Vous n'avez pas accès à cette boutique");
    if (!membership.isOwner && membership.role !== "ADMIN") {
      throw new ForbiddenException("Seul le propriétaire ou un ADMIN peut modifier la boutique");
    }

    const updated = await this.utilisateurRepo.modifierTenant(tenantId, {
      name: dto.nom,
      currency: dto.devise,
      activitySector: dto.secteurActivite,
      productTypesAllowed: dto.typesProduitsAutorises,
      email: dto.email,
      phone: dto.telephone,
      address: dto.adresse,
      taxRate: dto.tauxTva !== undefined ? String(dto.tauxTva) : undefined,
      paymentMethods: dto.methodesPaiement,
    });
    return this.toDetail(updated);
  }

  async supprimerBoutique(userId: string, tenantId: string): Promise<void> {
    const membership = await this.membershipRepo.trouver(userId, tenantId);
    if (!membership) throw new NotFoundException("Boutique introuvable");
    if (!membership.isOwner) {
      throw new ForbiddenException("Seul le propriétaire peut supprimer la boutique");
    }

    const autres = await this.membershipRepo.listerParUtilisateur(userId);
    const autresActifs = autres.filter((m) => m.tenant.id !== tenantId);
    if (autresActifs.length === 0) {
      throw new BadRequestException(
        "Impossible de supprimer votre seule boutique. Créez-en une autre d'abord.",
      );
    }

    await this.utilisateurRepo.supprimerTenant(tenantId);
    // Cascade : desactiver tous les memberships rattaches a ce tenant pour que
    // les autres utilisateurs ne le voient plus dans leur liste de boutiques.
    await this.membershipRepo.desactiverPourTenant(tenantId);
  }

  private toDetail(tenant: any): BoutiqueDetailDto {
    return {
      id: tenant.id,
      nom: tenant.name,
      slug: tenant.slug,
      secteurActivite: (tenant.activitySector ?? ActivitySector.AUTRE) as ActivitySector,
      typesProduitsAutorises: (tenant.productTypesAllowed ?? []) as ProductType[],
      devise: tenant.currency ?? "XOF",
      email: tenant.email,
      telephone: tenant.phone,
      adresse: tenant.address,
      tauxTva: Number(tenant.taxRate ?? 0),
      methodesPaiement: (tenant.paymentMethods ?? ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER"]) as any,
    };
  }
}
