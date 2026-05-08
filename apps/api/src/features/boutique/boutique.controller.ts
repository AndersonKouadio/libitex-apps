import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { AuthService } from "../auth/auth.service";
import { CreerBoutiqueDto } from "../auth/dto/auth.dto";
import { BoutiqueService } from "./boutique.service";
import { ModifierBoutiqueDto } from "./dto/boutique.dto";
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
  @ApiOperation({ summary: "Lister les boutiques accessibles à l'utilisateur connecté" })
  listerBoutiques(@CurrentUser() user: CurrentUserData) {
    return this.authService.listerBoutiques(user.userId);
  }

  @Post()
  @ApiOperation({ summary: "Créer une nouvelle boutique pour l'utilisateur connecté" })
  creerBoutique(@CurrentUser() user: CurrentUserData, @Body() dto: CreerBoutiqueDto) {
    return this.authService.creerBoutique(user.userId, dto);
  }

  @Get(":tenantId")
  @ApiOperation({ summary: "Détail d'une boutique (avec contact) à laquelle l'utilisateur a accès" })
  obtenir(@CurrentUser() user: CurrentUserData, @Param("tenantId") tenantId: string) {
    return this.boutiqueService.obtenirBoutique(user.userId, tenantId);
  }

  @Patch(":tenantId")
  @ApiOperation({ summary: "Modifier une boutique (nom, devise, secteur, contact)" })
  modifier(
    @CurrentUser() user: CurrentUserData,
    @Param("tenantId") tenantId: string,
    @Body() dto: ModifierBoutiqueDto,
  ) {
    return this.boutiqueService.modifierBoutique(user.userId, tenantId, dto);
  }

  @Delete(":tenantId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer une boutique (soft delete, propriétaire seulement)" })
  supprimer(@CurrentUser() user: CurrentUserData, @Param("tenantId") tenantId: string) {
    return this.boutiqueService.supprimerBoutique(user.userId, tenantId);
  }

  @Post(":tenantId/switch")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Basculer la session sur une autre boutique. Renvoie un nouveau token." })
  switcherBoutique(@CurrentUser() user: CurrentUserData, @Param("tenantId") tenantId: string) {
    return this.authService.switcherBoutique(user.userId, tenantId);
  }
}
