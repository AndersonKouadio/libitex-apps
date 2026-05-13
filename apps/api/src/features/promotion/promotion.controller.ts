import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { PromotionService } from "./promotion.service";
import {
  CreerPromotionDto, ModifierPromotionDto, ValiderCodeDto,
} from "./dto/promotion.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("Promotions")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("promotions")
export class PromotionController {
  constructor(private readonly service: PromotionService) {}

  @Post()
  @ApiOperation({ summary: "Creer un code promo" })
  @Roles("ADMIN", "MANAGER")
  creer(@CurrentUser() user: CurrentUserData, @Body() dto: CreerPromotionDto) {
    return this.service.creer(user.tenantId, user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les codes promo" })
  lister(@CurrentUser() user: CurrentUserData) {
    return this.service.lister(user.tenantId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Modifier un code promo" })
  @Roles("ADMIN", "MANAGER")
  modifier(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: ModifierPromotionDto,
  ) {
    return this.service.modifier(user.tenantId, user.userId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer un code promo (soft delete)" })
  @Roles("ADMIN", "MANAGER")
  supprimer(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.service.supprimer(user.tenantId, user.userId, id);
  }

  @Post("valider")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Valider un code (appele depuis le panier POS)" })
  valider(@CurrentUser() user: CurrentUserData, @Body() dto: ValiderCodeDto) {
    return this.service.valider(user.tenantId, dto);
  }
}
