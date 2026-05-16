import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { DevisService } from "./devis.service";
import {
  CreerDevisDto, ModifierDevisDto, ListerDevisQueryDto,
} from "./dto/devis.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("Devis")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("devis")
export class DevisController {
  constructor(private readonly devisService: DevisService) {}

  @Post()
  @ApiOperation({ summary: "Créer un devis (statut DRAFT, calcul auto des totaux)" })
  @Roles("ADMIN", "MANAGER", "COMMERCIAL")
  creer(@CurrentUser() user: CurrentUserData, @Body() dto: CreerDevisDto) {
    return this.devisService.creer(user.tenantId, user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les devis (pagination + filtres statut/client/dates/recherche)" })
  lister(@CurrentUser() user: CurrentUserData, @Query() query: ListerDevisQueryDto) {
    return this.devisService.lister(user.tenantId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Détail complet d'un devis (header + lignes + client)" })
  obtenir(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.devisService.obtenir(user.tenantId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Modifier un devis (DRAFT uniquement). Si lignes fourni, remplace tout." })
  @Roles("ADMIN", "MANAGER", "COMMERCIAL")
  modifier(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: ModifierDevisDto,
  ) {
    return this.devisService.modifier(user.tenantId, user.userId, id, dto);
  }

  @Patch(":id/envoyer")
  @ApiOperation({ summary: "Marquer le devis comme envoyé au client (DRAFT → SENT)" })
  @Roles("ADMIN", "MANAGER", "COMMERCIAL")
  envoyer(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.devisService.envoyer(user.tenantId, user.userId, id);
  }

  @Patch(":id/accepter")
  @ApiOperation({ summary: "Enregistrer l'acceptation client (SENT → ACCEPTED)" })
  @Roles("ADMIN", "MANAGER", "COMMERCIAL")
  accepter(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.devisService.accepter(user.tenantId, user.userId, id);
  }

  @Patch(":id/refuser")
  @ApiOperation({ summary: "Enregistrer le refus client (SENT → REFUSED)" })
  @Roles("ADMIN", "MANAGER", "COMMERCIAL")
  refuser(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.devisService.refuser(user.tenantId, user.userId, id);
  }

  @Patch(":id/annuler")
  @ApiOperation({ summary: "Annuler le devis (DRAFT/SENT/ACCEPTED → CANCELLED)" })
  @Roles("ADMIN", "MANAGER", "COMMERCIAL")
  annuler(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.devisService.annuler(user.tenantId, user.userId, id);
  }

  @Post(":id/dupliquer")
  @ApiOperation({ summary: "Créer un nouveau DRAFT à partir d'un devis existant" })
  @Roles("ADMIN", "MANAGER", "COMMERCIAL")
  dupliquer(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.devisService.dupliquer(user.tenantId, user.userId, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer un devis (DRAFT ou CANCELLED uniquement, soft delete)" })
  @Roles("ADMIN", "MANAGER")
  supprimer(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.devisService.supprimer(user.tenantId, user.userId, id);
  }
}
