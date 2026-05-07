import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { AuthService } from "../auth/auth.service";
import { CreerBoutiqueDto } from "../auth/dto/auth.dto";
import { BoutiqueService } from "./boutique.service";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";

@ApiTags("Boutiques")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("boutiques")
export class BoutiqueController {
  constructor(
    private readonly authService: AuthService,
    private readonly boutiqueService: BoutiqueService,
  ) {}

  @Get("mienne")
  @ApiOperation({ summary: "Obtenir la boutique actuellement active (depuis le JWT)" })
  obtenirBoutiqueActive(@CurrentUser() user: CurrentUserData) {
    return this.boutiqueService.obtenirBoutiqueActive(user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: "Lister les boutiques accessibles a l'utilisateur connecte" })
  listerBoutiques(@CurrentUser() user: CurrentUserData) {
    return this.authService.listerBoutiques(user.userId);
  }

  @Post()
  @ApiOperation({ summary: "Creer une nouvelle boutique pour l'utilisateur connecte" })
  creerBoutique(@CurrentUser() user: CurrentUserData, @Body() dto: CreerBoutiqueDto) {
    return this.authService.creerBoutique(user.userId, dto);
  }

  @Post(":tenantId/switch")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Basculer la session sur une autre boutique. Renvoie un nouveau token." })
  switcherBoutique(@CurrentUser() user: CurrentUserData, @Param("tenantId") tenantId: string) {
    return this.authService.switcherBoutique(user.userId, tenantId);
  }
}
