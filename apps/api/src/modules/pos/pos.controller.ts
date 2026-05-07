import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { PosService } from "./pos.service";
import { CreateTicketDto, CompleteTicketDto } from "./dto/pos.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("POS")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("pos")
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post("tickets")
  @ApiOperation({ summary: "Create a new ticket (open sale)" })
  @Roles("ADMIN", "MANAGER", "CASHIER")
  async createTicket(@CurrentUser() user: CurrentUserData, @Body() dto: CreateTicketDto) {
    return this.posService.createTicket(user.tenantId, user.userId, dto);
  }

  @Post("tickets/:id/complete")
  @ApiOperation({ summary: "Complete a ticket — process payments & decrement stock" })
  @Roles("ADMIN", "MANAGER", "CASHIER")
  async completeTicket(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: CompleteTicketDto,
  ) {
    return this.posService.completeTicket(user.tenantId, user.userId, id, dto);
  }

  @Patch("tickets/:id/park")
  @ApiOperation({ summary: "Park a ticket (hold for later)" })
  @Roles("ADMIN", "MANAGER", "CASHIER")
  async parkTicket(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.posService.parkTicket(user.tenantId, id);
  }

  @Patch("tickets/:id/void")
  @ApiOperation({ summary: "Void a ticket (cancel)" })
  @Roles("ADMIN", "MANAGER")
  async voidTicket(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.posService.voidTicket(user.tenantId, id);
  }

  @Get("tickets/:id")
  @ApiOperation({ summary: "Get ticket details with lines and payments" })
  async getTicket(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.posService.getTicket(user.tenantId, id);
  }

  @Get("tickets")
  @ApiOperation({ summary: "List tickets (paginated)" })
  @ApiQuery({ name: "locationId", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async listTickets(
    @CurrentUser() user: CurrentUserData,
    @Query("locationId") locationId?: string,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.posService.listTickets(user.tenantId, locationId, status, page, limit);
  }

  @Get("z-report/:locationId")
  @ApiOperation({ summary: "Daily Z report (sales summary by payment method)" })
  @ApiQuery({ name: "date", required: false, description: "YYYY-MM-DD, defaults to today" })
  @Roles("ADMIN", "MANAGER")
  async zReport(
    @CurrentUser() user: CurrentUserData,
    @Param("locationId") locationId: string,
    @Query("date") date?: string,
  ) {
    return this.posService.zReport(user.tenantId, locationId, date);
  }
}
