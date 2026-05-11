import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { VenteService } from "./vente.service";
import { CreerTicketDto, CompleterTicketDto, ListerTicketsQueryDto } from "./dto/vente.dto";
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
    return this.venteService.mettreEnAttente(user.tenantId, user.userId, id);
  }

  @Patch("tickets/:id/reporter")
  @ApiOperation({
    summary: "Reporter un ticket parqué — détache de la session pour reprise dans une nouvelle session",
  })
  @Roles("ADMIN", "MANAGER", "CASHIER")
  reporter(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.venteService.reporter(user.tenantId, id);
  }

  @Patch("tickets/:id/annuler")
  @ApiOperation({ summary: "Annuler un ticket" })
  @Roles("ADMIN", "MANAGER")
  annuler(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.venteService.annuler(user.tenantId, user.userId, id);
  }

  @Get("tickets/:id")
  @ApiOperation({ summary: "Obtenir un ticket avec ses lignes et paiements" })
  obtenirTicket(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.venteService.obtenirTicket(user.tenantId, id);
  }

  @Get("tickets")
  @ApiOperation({ summary: "Lister les tickets (pagine, filtres emplacement/statut)" })
  listerTickets(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ListerTicketsQueryDto,
  ) {
    return this.venteService.listerTickets(
      user.tenantId, query.page, query.limit, query.emplacementId, query.statut,
    );
  }

  @Get("sessions/:sessionId/rapport-z")
  @ApiOperation({
    summary: "Rapport Z d'une session caisse (synthese ventes par methode de paiement)",
  })
  @Roles("ADMIN", "MANAGER", "CASHIER")
  rapportZ(@CurrentUser() user: CurrentUserData, @Param("sessionId") sessionId: string) {
    return this.venteService.rapportZ(user.tenantId, sessionId);
  }

  @Get("rapport-z/:emplacementId")
  @ApiOperation({
    summary: "Rapport Z journalier par emplacement (toutes sessions confondues) — inclut top produits et ventes par heure",
  })
  @Roles("ADMIN", "MANAGER")
  rapportZJour(
    @CurrentUser() user: CurrentUserData,
    @Param("emplacementId") emplacementId: string,
    @Query("date") date?: string,
  ) {
    const dateEffective = date ?? new Date().toISOString().split("T")[0]!;
    return this.venteService.rapportZParJour(user.tenantId, emplacementId, dateEffective);
  }
}
