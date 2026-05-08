import { Injectable, Logger, NotFoundException, ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { ActivitySector, ACTIVITY_SECTOR_PRODUCT_TYPES } from "@libitex/shared";
import { UtilisateurRepository } from "./repositories/utilisateur.repository";
import { MembershipRepository } from "./repositories/membership.repository";
import { StockService } from "../stock/stock.service";
import { AuditService, AUDIT_ACTIONS } from "../../common/audit/audit.service";
import {
  IdentifiantsInvalidesException,
  EmailDejaUtiliseException,
  SlugDejaUtiliseException,
} from "../../common/exceptions/metier.exception";
import {
  ConnexionDto, InscriptionDto, CreerBoutiqueDto,
  AuthResponseDto, BoutiqueResumeDto, TokenPayload,
} from "./dto/auth.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly utilisateurRepo: UtilisateurRepository,
    private readonly membershipRepo: MembershipRepository,
    private readonly stockService: StockService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async inscrire(dto: InscriptionDto): Promise<AuthResponseDto> {
    const slugExiste = await this.utilisateurRepo.trouverTenantParSlug(dto.slugBoutique);
    if (slugExiste) throw new SlugDejaUtiliseException();

    const emailExiste = await this.utilisateurRepo.trouverParEmail(dto.email);
    if (emailExiste) throw new EmailDejaUtiliseException();

    const tenant = await this.utilisateurRepo.creerTenant({
      name: dto.nomBoutique,
      slug: dto.slugBoutique,
      email: dto.email,
      currency: dto.devise || "XOF",
      activitySector: dto.secteurActivite ?? ActivitySector.AUTRE,
    });

    const hash = await bcrypt.hash(dto.motDePasse, 12);
    const user = await this.utilisateurRepo.creerUtilisateur({
      tenantId: tenant.id,
      email: dto.email,
      passwordHash: hash,
      firstName: dto.prenom,
      lastName: dto.nomFamille,
      phone: dto.telephone,
      role: "ADMIN",
    });

    await this.membershipRepo.creer({
      userId: user.id,
      tenantId: tenant.id,
      role: "ADMIN",
      isOwner: true,
      accessAllLocations: true,
    });

    try {
      await this.stockService.creerEmplacement(tenant.id, {
        nom: dto.nomBoutique,
        type: "STORE",
      });
    } catch (err) {
      this.logger.error(
        `Échec creation emplacement par defaut pour tenant ${tenant.id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }

    await this.audit.log({
      tenantId: tenant.id, userId: user.id,
      action: AUDIT_ACTIONS.TENANT_CREATED,
      entityType: "TENANT", entityId: tenant.id,
      after: { nom: tenant.name, slug: tenant.slug, secteurActivite: tenant.activitySector },
    });

    return this.construireReponseAuth(user, tenant.id);
  }

  async connecter(dto: ConnexionDto): Promise<AuthResponseDto> {
    const user = await this.utilisateurRepo.trouverParEmail(dto.email);
    if (!user) {
      // On ne peut pas auditer (pas de tenantId/userId), juste lever l'exception.
      throw new IdentifiantsInvalidesException();
    }

    const motDePasseValide = await bcrypt.compare(dto.motDePasse, user.passwordHash);
    if (!motDePasseValide) {
      // L'utilisateur existe mais le mot de passe est mauvais : auditable.
      if (user.tenantId) {
        await this.audit.log({
          tenantId: user.tenantId, userId: user.id,
          action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
          entityType: "USER", entityId: user.id,
          after: { email: dto.email },
        });
      }
      throw new IdentifiantsInvalidesException();
    }

    await this.assurerMembership(user.id, user.tenantId, user.role);
    await this.utilisateurRepo.mettreAJourDerniereConnexion(user.id);

    const memberships = await this.membershipRepo.listerParUtilisateur(user.id);
    const tenantActifId = memberships[0]?.tenant.id;
    if (!tenantActifId) {
      throw new ForbiddenException("Aucune boutique associee a ce compte");
    }

    await this.audit.log({
      tenantId: tenantActifId, userId: user.id,
      action: AUDIT_ACTIONS.USER_LOGIN,
      entityType: "USER", entityId: user.id,
      after: { email: user.email },
    });

    return this.construireReponseAuth(user, tenantActifId);
  }

  async listerBoutiques(userId: string): Promise<BoutiqueResumeDto[]> {
    const list = await this.membershipRepo.listerParUtilisateur(userId);
    return list.map(({ membership, tenant }) => this.toBoutiqueResume(tenant, membership));
  }

  async creerBoutique(userId: string, dto: CreerBoutiqueDto): Promise<BoutiqueResumeDto> {
    const slugExiste = await this.utilisateurRepo.trouverTenantParSlug(dto.slugBoutique);
    if (slugExiste) throw new SlugDejaUtiliseException();

    const tenant = await this.utilisateurRepo.creerTenant({
      name: dto.nomBoutique,
      slug: dto.slugBoutique,
      currency: dto.devise || "XOF",
      activitySector: dto.secteurActivite,
    });

    const membership = await this.membershipRepo.creer({
      userId,
      tenantId: tenant.id,
      role: "ADMIN",
      isOwner: true,
      accessAllLocations: true,
    });

    try {
      await this.stockService.creerEmplacement(tenant.id, {
        nom: dto.nomBoutique,
        type: "STORE",
      });
    } catch (err) {
      this.logger.error(
        `Échec creation emplacement defaut pour boutique ${tenant.id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }

    return this.toBoutiqueResume(tenant, membership);
  }

  async switcherBoutique(userId: string, tenantId: string): Promise<AuthResponseDto> {
    const user = await this.utilisateurRepo.trouverParId(userId);
    if (!user) throw new NotFoundException("Utilisateur introuvable");

    const membership = await this.membershipRepo.trouver(userId, tenantId);
    if (!membership) throw new ForbiddenException("Vous n'avez pas accès a cette boutique");

    return this.construireReponseAuth(user, tenantId);
  }

  // --- Internes ---

  private async assurerMembership(userId: string, legacyTenantId: string | null, role: string) {
    if (!legacyTenantId) return;
    const existant = await this.membershipRepo.trouver(userId, legacyTenantId);
    if (existant) return;
    await this.membershipRepo.creer({
      userId,
      tenantId: legacyTenantId,
      role: role as "ADMIN" | "MANAGER" | "CASHIER" | "WAREHOUSE" | "COMMERCIAL" | "SUPER_ADMIN",
      isOwner: role === "ADMIN",
      accessAllLocations: true,
    });
  }

  private async construireReponseAuth(user: any, tenantActifId: string): Promise<AuthResponseDto> {
    const memberships = await this.membershipRepo.listerParUtilisateur(user.id);
    const boutiques = memberships.map(({ membership, tenant }) => this.toBoutiqueResume(tenant, membership));
    const boutiqueActive = boutiques.find((b) => b.id === tenantActifId) ?? boutiques[0]!;

    const membershipActif = memberships.find((m) => m.tenant.id === boutiqueActive.id);
    const role = membershipActif?.membership.role ?? user.role;

    const payload: TokenPayload = { sub: user.id, tenantId: boutiqueActive.id, role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get<string>("JWT_REFRESH_EXPIRES_IN", "7d") as any,
    });
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.utilisateurRepo.sauvegarderRefreshToken(user.id, refreshHash);

    return {
      accessToken,
      refreshToken,
      utilisateur: {
        id: user.id,
        tenantId: boutiqueActive.id,
        role,
        email: user.email,
        prenom: user.firstName,
        nomFamille: user.lastName,
        mustChangePassword: user.mustChangePassword ?? false,
      },
      boutiques,
      boutiqueActive,
    };
  }

  async changerMotDePasse(
    userId: string,
    motDePasseActuel: string,
    nouveauMotDePasse: string,
  ): Promise<{ ok: true }> {
    const user = await this.utilisateurRepo.trouverParId(userId);
    if (!user) throw new IdentifiantsInvalidesException();

    const valide = await bcrypt.compare(motDePasseActuel, user.passwordHash);
    if (!valide) throw new IdentifiantsInvalidesException();

    if (motDePasseActuel === nouveauMotDePasse) {
      throw new IdentifiantsInvalidesException();
    }

    const hash = await bcrypt.hash(nouveauMotDePasse, 12);
    await this.utilisateurRepo.changerMotDePasse(userId, hash);
    return { ok: true };
  }

  private toBoutiqueResume(tenant: any, membership: any): BoutiqueResumeDto {
    return {
      id: tenant.id,
      nom: tenant.name,
      slug: tenant.slug,
      secteurActivite: tenant.activitySector ?? ActivitySector.AUTRE,
      devise: tenant.currency ?? "XOF",
      role: membership.role,
      isOwner: membership.isOwner ?? false,
    };
  }
}
