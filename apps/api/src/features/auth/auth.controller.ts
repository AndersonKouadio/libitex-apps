import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { ConnexionDto, InscriptionDto } from "./dto/auth.dto";

@ApiTags("Authentification")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("inscription")
  @ApiOperation({ summary: "Inscription — créé une boutique et un compte administrateur" })
  @ApiResponse({ status: 201, description: "Boutique et compte crees" })
  @ApiResponse({ status: 409, description: "Email ou identifiant boutique déjà pris" })
  inscrire(@Body() dto: InscriptionDto) {
    return this.authService.inscrire(dto);
  }

  @Post("connexion")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connexion par email et mot de passe" })
  @ApiResponse({ status: 200, description: "Connexion reussie" })
  @ApiResponse({ status: 401, description: "Identifiants invalides" })
  connecter(@Body() dto: ConnexionDto) {
    return this.authService.connecter(dto);
  }
}
