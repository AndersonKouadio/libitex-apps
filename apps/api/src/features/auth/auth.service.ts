import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { UtilisateurRepository } from "./repositories/utilisateur.repository";
import {
  IdentifiantsInvalidesException,
  EmailDejaUtiliseException,
  SlugDejaUtiliseException,
} from "../../common/exceptions/metier.exception";
import {
  ConnexionDto, InscriptionDto, AuthResponseDto,
  TokenPayload, UtilisateurSessionDto,
} from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly utilisateurRepo: UtilisateurRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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

    return this.genererTokens(user);
  }

  async connecter(dto: ConnexionDto): Promise<AuthResponseDto> {
    const user = await this.utilisateurRepo.trouverParEmail(dto.email);
    if (!user) throw new IdentifiantsInvalidesException();

    const motDePasseValide = await bcrypt.compare(dto.motDePasse, user.passwordHash);
    if (!motDePasseValide) throw new IdentifiantsInvalidesException();

    await this.utilisateurRepo.mettreAJourDerniereConnexion(user.id);

    return this.genererTokens(user);
  }

  private async genererTokens(user: any): Promise<AuthResponseDto> {
    const payload: TokenPayload = { sub: user.id, tenantId: user.tenantId, role: user.role };

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
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
        prenom: user.firstName,
        nomFamille: user.lastName,
      },
    };
  }
}
