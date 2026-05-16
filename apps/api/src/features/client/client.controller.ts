import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ValidateNested, IsArray } from "class-validator";
import { ClientService } from "./client.service";
import { CreerClientDto, ModifierClientDto } from "./dto/client.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";

class ImporterClientsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreerClientDto)
  clients!: CreerClientDto[];
}

@ApiTags("Clients")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("clients")
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  @ApiOperation({ summary: "Lister les clients (avec segment calcule)" })
  lister(
    @CurrentUser() user: CurrentUserData,
    @Query("page") page = "1",
    @Query("limit") limit = "50",
    @Query("recherche") recherche?: string,
    @Query("segment") segment?: "VIP" | "REGULIER" | "OCCASIONNEL" | "INACTIF" | "NOUVEAU",
  ) {
    return this.clientService.lister(user.tenantId, Number(page), Number(limit), recherche, segment);
  }

  @Get(":id")
  @ApiOperation({ summary: "Détail d'un client" })
  obtenir(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.clientService.obtenir(user.tenantId, id);
  }

  @Get(":id/kpis")
  @ApiOperation({ summary: "KPIs cumules : CA total, nb tickets, ticket moyen, premier/dernier achat" })
  kpis(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.clientService.kpis(user.tenantId, id);
  }

  @Get(":id/historique")
  @ApiOperation({ summary: "Historique des tickets COMPLETED du client (pagine)" })
  historique(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "25",
  ) {
    return this.clientService.historique(user.tenantId, id, Number(page), Number(pageSize));
  }

  @Post()
  @ApiOperation({ summary: "Créer un client" })
  creer(@CurrentUser() user: CurrentUserData, @Body() dto: CreerClientDto) {
    return this.clientService.creer(user.tenantId, dto);
  }

  @Post("import")
  @ApiOperation({ summary: "Import en lot — retourne {total, succes, erreurs[]}" })
  importer(@CurrentUser() user: CurrentUserData, @Body() dto: ImporterClientsDto) {
    return this.clientService.importer(user.tenantId, dto.clients);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Modifier un client" })
  modifier(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: ModifierClientDto,
  ) {
    return this.clientService.modifier(user.tenantId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer un client (soft delete)" })
  supprimer(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.clientService.supprimer(user.tenantId, id);
  }
}
