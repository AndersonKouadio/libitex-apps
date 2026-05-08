import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { SupplementService } from "./supplement.service";
import { CreerSupplementDto, ModifierSupplementDto } from "./dto/supplement.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("Suppléments")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("supplements")
export class SupplementController {
  constructor(private readonly service: SupplementService) {}

  @Get()
  @ApiOperation({ summary: "Lister les suppléments de la boutique" })
  lister(@CurrentUser() user: CurrentUserData) {
    return this.service.lister(user.tenantId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Détail d'un supplément" })
  obtenir(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.service.obtenir(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: "Créer un supplément" })
  @Roles("ADMIN", "MANAGER")
  creer(@CurrentUser() user: CurrentUserData, @Body() dto: CreerSupplementDto) {
    return this.service.creer(user.tenantId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Modifier un supplément" })
  @Roles("ADMIN", "MANAGER")
  modifier(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: ModifierSupplementDto,
  ) {
    return this.service.modifier(user.tenantId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer un supplément (soft delete)" })
  @Roles("ADMIN")
  supprimer(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.service.supprimer(user.tenantId, id);
  }
}
