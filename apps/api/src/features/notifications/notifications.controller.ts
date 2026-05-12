import {
  Controller, Get, Query, UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { WhatsAppMetaProvider } from "./providers/whatsapp-meta.provider";
import { EmailNotificationProvider } from "./providers/email-notif.provider";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

/**
 * Module 10 D3 : endpoints admin pour la page Notifications.
 * - GET / : lister les 30 derniers envois (audit + debug)
 * - GET /status : etat des providers (WhatsApp configure ? Email configure ?)
 *
 * Reserve aux ADMIN/MANAGER : les caissiers n'ont rien a faire ici.
 */
@ApiTags("Notifications")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly whatsapp: WhatsAppMetaProvider,
    private readonly email: EmailNotificationProvider,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lister les envois recents de notifications" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @Roles("ADMIN", "MANAGER")
  async lister(
    @CurrentUser() user: CurrentUserData,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.service.lister(user.tenantId, {
      limit: limit ? Math.min(100, Math.max(1, Number(limit))) : 30,
      offset: offset ? Math.max(0, Number(offset)) : 0,
    });
  }

  @Get("status")
  @ApiOperation({ summary: "Etat des providers de notifications" })
  @Roles("ADMIN", "MANAGER")
  status() {
    return {
      whatsapp: {
        canal: "whatsapp",
        disponible: this.whatsapp.disponible,
        provider: "Meta Cloud API",
      },
      email: {
        canal: "email",
        disponible: this.email.disponible,
        provider: "SMTP (nodemailer)",
      },
    };
  }
}
