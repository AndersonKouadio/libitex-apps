import {
  Controller, Post, Body, HttpCode, HttpStatus, UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import {
  ConnexionDto, InscriptionDto, ChangerMotDePasseDto,
  DemanderResetDto, ReinitialiserMotDePasseDto,
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

  @Post("reinitialiser-mot-de-passe")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Définit un nouveau mot de passe via le token reçu par email" })
  @ApiResponse({ status: 200, description: "Mot de passe réinitialisé" })
  @ApiResponse({ status: 400, description: "Lien invalide ou expiré" })
  reinitialiser(@Body() dto: ReinitialiserMotDePasseDto) {
    return this.authService.reinitialiserMotDePasse(dto.token, dto.nouveauMotDePasse);
  }
}
