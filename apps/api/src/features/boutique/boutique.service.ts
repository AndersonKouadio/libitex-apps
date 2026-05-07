import { Injectable, NotFoundException } from "@nestjs/common";
import { ActivitySector, ProductType } from "@libitex/shared";
import { UtilisateurRepository } from "../auth/repositories/utilisateur.repository";
import { BoutiqueDetailDto } from "./dto/boutique.dto";

@Injectable()
export class BoutiqueService {
  constructor(private readonly utilisateurRepo: UtilisateurRepository) {}

  async obtenirBoutiqueActive(tenantId: string): Promise<BoutiqueDetailDto> {
    const tenant = await this.utilisateurRepo.trouverTenantParId(tenantId);
    if (!tenant) throw new NotFoundException("Boutique introuvable");

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
    };
  }
}
