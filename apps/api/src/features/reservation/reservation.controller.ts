import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { ReservationService } from "./reservation.service";
import { CreerReservationDto, ModifierReservationDto } from "./dto/reservation.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";

@ApiTags("Reservations")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("reservations")
export class ReservationController {
  constructor(private readonly service: ReservationService) {}

  @Post()
  @ApiOperation({ summary: "Creer une reservation" })
  creer(@CurrentUser() user: CurrentUserData, @Body() dto: CreerReservationDto) {
    return this.service.creer(user.tenantId, user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les reservations (filtres : date, emplacement, statut)" })
  lister(
    @CurrentUser() user: CurrentUserData,
    @Query("emplacementId") emplacementId?: string,
    @Query("statut") statut?: string,
    @Query("dateDebut") dateDebut?: string,
    @Query("dateFin") dateFin?: string,
  ) {
    return this.service.lister(user.tenantId, { emplacementId, statut, dateDebut, dateFin });
  }

  @Get("resume-jour")
  @ApiOperation({ summary: "Resume des reservations sur une journee" })
  resumeJour(
    @CurrentUser() user: CurrentUserData,
    @Query("date") date?: string,
  ) {
    return this.service.resumeJour(user.tenantId, date);
  }

  @Get(":id")
  @ApiOperation({ summary: "Detail d'une reservation" })
  obtenir(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.service.obtenir(user.tenantId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Modifier une reservation (statut, date, table, ...)" })
  modifier(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: ModifierReservationDto,
  ) {
    return this.service.modifier(user.tenantId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer une reservation (soft delete)" })
  supprimer(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.service.supprimer(user.tenantId, id);
  }
}
