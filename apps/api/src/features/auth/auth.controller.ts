import {
  Controller, Get, Post, Patch, Delete, Body, HttpCode, HttpStatus, UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import {
  ConnexionDto, InscriptionDto, ChangerMotDePasseDto,
  DemanderResetDto, ReinitialiserMotDePasseDto,
  ModifierProfilDto, SupprimerCompteDto,
  RafraichirTokenDto, RafraichirTokenResponseDto,
} from "./dto/auth.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";

@ApiTags("Authentification")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("inscription")
  @ApiOperation({ summary: "Inscription — crée une boutique et un compte administrateur" })
  @ApiResponse({ status: 201, description: "Boutique et compte créés" })
  @ApiResponse({ status: 409, description: "Email ou identifiant boutique déjà pris" })
  inscrire(@Body() dto: InscriptionDto) {
    return this.authService.inscrire(dto);
  }

  @Post("connexion")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connexion par email et mot de passe" })
  @ApiResponse({ status: 200, description: "Connexion réussie" })
  @ApiResponse({ status: 401, description: "Identifiants invalides" })
  connecter(@Body() dto: ConnexionDto) {
    return this.authService.connecter(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rafraichit l'access token a partir d'un refresh token valide (rotate)",
    description:
      "Echange un refreshToken contre un nouveau couple access+refresh. "
      + "L'ancien refresh est invalide (usage unique). Echoue si le token est "
      + "expire, le compte desactive, ou la membership revoquee.",
  })
  @ApiResponse({ status: 200, description: "Nouveau couple access+refresh", type: RafraichirTokenResponseDto })
  @ApiResponse({ status: 400, description: "Body invalide (refreshToken manquant ou pas une chaine)" })
  @ApiResponse({ status: 403, description: "Token invalide/expire, compte desactive, ou acces a la boutique revoque" })
  rafraichirToken(@Body() dto: RafraichirTokenDto) {
    return this.authService.rafraichirToken(dto.refreshToken);
  }

  @Post("changer-mot-de-passe")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Modifier son mot de passe (et lever le drapeau mustChangePassword si présent)",
  })
  @ApiResponse({ status: 200, description: "Mot de passe modifié" })
  @ApiResponse({ status: 401, description: "Mot de passe actuel invalide" })
  changerMotDePasse(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ChangerMotDePasseDto,
  ) {
    return this.authService.changerMotDePasse(
      user.userId,
      dto.motDePasseActuel,
      dto.nouveauMotDePasse,
    );
  }

  @Post("mot-de-passe-oublie")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Envoie un lien de réinitialisation par email" })
  @ApiResponse({ status: 200, description: "Email envoyé (réponse identique si compte inexistant)" })
  demanderReset(@Body() dto: DemanderResetDto) {
    return this.authService.demanderReinitialisation(dto.email);
  }

  @Get("profil")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Profil de l'utilisateur connecté" })
  obtenirProfil(@CurrentUser() user: CurrentUserData) {
    return this.authService.obtenirProfil(user.userId);
  }

  @Patch("profil")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Modifier le profil (prénom, nom, téléphone). L'email reste fixé à l'inscription." })
  modifierProfil(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ModifierProfilDto,
  ) {
    return this.authService.modifierProfil(user.userId, dto);
  }

  @Delete("compte")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Supprimer définitivement son compte (refuse si propriétaire d'au moins une boutique)" })
  supprimerCompte(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SupprimerCompteDto,
  ) {
    return this.authService.supprimerCompte(user.userId, dto.motDePasse);
  }

  @Post("reinitialiser-mot-de-passe")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Définit un nouveau mot de passe via le token reçu par email" })
  @ApiResponse({ status: 200, description: "Mot de passe réinitialisé" })
  @ApiResponse({ status: 400, description: "Lien invalide ou expiré" })
  reinitialiser(@Body() dto: ReinitialiserMotDePasseDto) {
    return this.authService.reinitialiserMotDePasse(dto.token, dto.nouveauMotDePasse);
  }
}
