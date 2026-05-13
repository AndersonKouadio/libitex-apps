import {
  Controller, Get, Patch, Param, Body, UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { LocationSettingsService } from "./location-settings.service";
import { ModifierLocationSettingsDto } from "./dto/location-settings.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

/**
 * Module 15 D1 : configuration par emplacement (override tenant).
 * Lecture autorisee a tout role, ecriture reservee ADMIN/MANAGER.
 */
@ApiTags("Configuration emplacement")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("emplacements/:locationId/settings")
export class LocationSettingsController {
  constructor(private readonly service: LocationSettingsService) {}

  @Get()
  @ApiOperation({ summary: "Lire les reglages bruts (overrides only)" })
  obtenir(
    @CurrentUser() user: CurrentUserData,
    @Param("locationId") locationId: string,
  ) {
    return this.service.obtenir(user.tenantId, locationId);
  }

  @Get("effectifs")
  @ApiOperation({ summary: "Reglages effectifs (merge tenant defaults + override)" })
  obtenirEffectif(
    @CurrentUser() user: CurrentUserData,
    @Param("locationId") locationId: string,
  ) {
    return this.service.obtenirEffectif(user.tenantId, locationId);
  }

  @Patch()
  @ApiOperation({ summary: "Modifier les overrides de cet emplacement" })
  @Roles("ADMIN", "MANAGER")
  modifier(
    @CurrentUser() user: CurrentUserData,
    @Param("locationId") locationId: string,
    @Body() dto: ModifierLocationSettingsDto,
  ) {
    return this.service.modifier(user.tenantId, locationId, dto);
  }
}
