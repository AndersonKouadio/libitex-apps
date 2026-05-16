import {
  Controller, Get, Query, UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { ComptabiliteService } from "./comptabilite.service";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("Comptabilité")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("comptabilite")
export class ComptabiliteController {
  constructor(private readonly service: ComptabiliteService) {}

  @Get("plan-comptable")
  @ApiOperation({ summary: "Plan comptable OHADA du tenant (seed auto si premiere fois)" })
  @Roles("ADMIN", "MANAGER")
  listerPlan(@CurrentUser() user: CurrentUserData) {
    return this.service.listerPlanComptable(user.tenantId);
  }

  @Get("journal")
  @ApiOperation({ summary: "Journal des ecritures (pagine, filtres date + type)" })
  @Roles("ADMIN", "MANAGER")
  listerJournal(
    @CurrentUser() user: CurrentUserData,
    @Query("page") page = "1",
    @Query("limit") limit = "25",
    @Query("dateDebut") dateDebut?: string,
    @Query("dateFin") dateFin?: string,
    @Query("referenceType") referenceType?: string,
  ) {
    return this.service.listerJournal(user.tenantId, Number(page), Number(limit), {
      dateDebut, dateFin, referenceType,
    });
  }

  @Get("balance")
  @ApiOperation({ summary: "Balance des comptes — debits/credits/solde par compte sur une periode" })
  @Roles("ADMIN", "MANAGER")
  balance(
    @CurrentUser() user: CurrentUserData,
    @Query("dateDebut") dateDebut?: string,
    @Query("dateFin") dateFin?: string,
  ) {
    return this.service.balanceComptes(user.tenantId, dateDebut, dateFin);
  }
}
