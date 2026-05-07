import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { VenteService } from "./vente.service";
import { CreerTicketDto, CompleterTicketDto } from "./dto/vente.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("Vente / POS")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("vente")
export class VenteController {
  constructor(private readonly venteService: VenteService) {}

  @Post("tickets")
  @ApiOperation({ summary: "Créer un nouveau ticket de vente" })
  @Roles("ADMIN", "MANAGER", "CASHIER")
  creerTicket(@CurrentUser() user: CurrentUserData, @Body() dto: CreerTicketDto) {
    return this.venteService.creerTicket(user.tenantId, user.userId, dto);
  }

  @Post("tickets/:id/completer")
  @ApiOperation({ summary: "Compléter un ticket — enregistrer paiements et decrementer stock" })
  @Roles("ADMIN", "MANAGER", "CASHIER")
  completerTicket(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: CompleterTicketDto,
  ) {
    return this.venteService.completerTicket(user.tenantId, user.userId, id, dto);
  }

  @Patch("tickets/:id/attente")
  @ApiOperation({ summary: "Mettre un ticket en attente" })
  @Roles("ADMIN", "MANAGER", "CASHIER")
  mettreEnAttente(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.venteService.mettreEnAttente(user.tenantId, id);
  }

  @Patch("tickets/:id/annuler")
  @ApiOperation({ summary: "Annuler un ticket" })
  @Roles("ADMIN", "MANAGER")
  annuler(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.venteService.annuler(user.tenantId, id);
  }

  @Get("tickets/:id")
  @ApiOperation({ summary: "Obtenir un ticket avec ses lignes et paiements" })
  obtenirTicket(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.venteService.obtenirTicket(user.tenantId, id);
  }

  @Get("tickets")
  @ApiOperation({ summary: "Lister les tickets (pagine)" })
  @ApiQuery({ name: "emplacementId", required: false })
  @ApiQuery({ name: "statut", required: false })
  listerTickets(
    @CurrentUser() user: CurrentUserData,
    @Query() pagination: PaginationDto,
    @Query("emplacementId") emplacementId?: string,
    @Query("statut") statut?: string,
  ) {
    return this.venteService.listerTickets(
      user.tenantId, pagination.page, pagination.limit, emplacementId, statut,
    );
  }

  @Get("rapport-z/:emplacementId")
  @ApiOperation({ summary: "Rapport Z journalier (synthese des ventes par moyen de paiement)" })
  @ApiQuery({ name: "date", required: false, description: "AAAA-MM-JJ, defaut aujourd'hui" })
  @Roles("ADMIN", "MANAGER")
  rapportZ(
    @CurrentUser() user: CurrentUserData,
    @Param("emplacementId") emplacementId: string,
    @Query("date") date?: string,
  ) {
    return this.venteService.rapportZ(user.tenantId, emplacementId, date);
  }
}
