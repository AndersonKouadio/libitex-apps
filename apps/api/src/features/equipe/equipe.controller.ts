import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { EquipeService } from "./equipe.service";
import { InviterMembreDto, ModifierMembreDto } from "./dto/equipe.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("Equipe")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("equipe")
export class EquipeController {
  constructor(private readonly equipeService: EquipeService) {}

  @Get()
  @ApiOperation({ summary: "Lister les membres de la boutique active" })
  lister(@CurrentUser() user: CurrentUserData) {
    return this.equipeService.lister(user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: "Inviter un nouveau membre dans la boutique" })
  @Roles("ADMIN", "MANAGER")
  inviter(@CurrentUser() user: CurrentUserData, @Body() dto: InviterMembreDto) {
    return this.equipeService.inviter(user.tenantId, dto);
  }

  @Patch(":membershipId")
  @ApiOperation({ summary: "Modifier le role ou les acces d'un membre" })
  @Roles("ADMIN", "MANAGER")
  modifier(
    @CurrentUser() user: CurrentUserData,
    @Param("membershipId") membershipId: string,
    @Body() dto: ModifierMembreDto,
  ) {
    return this.equipeService.modifier(user.tenantId, membershipId, dto);
  }

  @Delete(":membershipId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Retirer un membre de la boutique (soft delete)" })
  @Roles("ADMIN")
  retirer(
    @CurrentUser() user: CurrentUserData,
    @Param("membershipId") membershipId: string,
  ) {
    return this.equipeService.retirer(user.tenantId, membershipId);
  }
}
