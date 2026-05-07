import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { StockService } from "./stock.service";
import { CreateLocationDto, StockInDto, StockAdjustmentDto, TransferRequestDto } from "./dto/stock.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("Stock")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("stock")
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // ─── Locations ───

  @Post("locations")
  @ApiOperation({ summary: "Create a location (warehouse, store)" })
  @Roles("ADMIN", "MANAGER")
  async createLocation(@CurrentUser() user: CurrentUserData, @Body() dto: CreateLocationDto) {
    return this.stockService.createLocation(user.tenantId, dto);
  }

  @Get("locations")
  @ApiOperation({ summary: "List all locations" })
  async listLocations(@CurrentUser() user: CurrentUserData) {
    return this.stockService.listLocations(user.tenantId);
  }

  // ─── Stock Movements ───

  @Post("in")
  @ApiOperation({ summary: "Stock in — receive goods into a location" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  async stockIn(@CurrentUser() user: CurrentUserData, @Body() dto: StockInDto) {
    return this.stockService.stockIn(user.tenantId, user.userId, dto);
  }

  @Post("adjust")
  @ApiOperation({ summary: "Stock adjustment (inventory correction)" })
  @Roles("ADMIN", "MANAGER")
  async adjust(@CurrentUser() user: CurrentUserData, @Body() dto: StockAdjustmentDto) {
    return this.stockService.adjust(user.tenantId, user.userId, dto);
  }

  @Post("transfer")
  @ApiOperation({ summary: "Transfer stock between locations" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  async transfer(@CurrentUser() user: CurrentUserData, @Body() dto: TransferRequestDto) {
    return this.stockService.transfer(user.tenantId, user.userId, dto);
  }

  // ─── Stock Queries ───

  @Get("current/:variantId/:locationId")
  @ApiOperation({ summary: "Get current stock for a variant at a location" })
  async getCurrentStock(
    @CurrentUser() user: CurrentUserData,
    @Param("variantId") variantId: string,
    @Param("locationId") locationId: string,
  ) {
    const quantity = await this.stockService.getCurrentStock(user.tenantId, variantId, locationId);
    return { variantId, locationId, quantity };
  }

  @Get("location/:locationId")
  @ApiOperation({ summary: "Get all stock at a location" })
  async getStockByLocation(
    @CurrentUser() user: CurrentUserData,
    @Param("locationId") locationId: string,
  ) {
    return this.stockService.getStockByLocation(user.tenantId, locationId);
  }

  @Get("variant/:variantId")
  @ApiOperation({ summary: "Get stock across all locations for a variant" })
  async getStockByVariant(
    @CurrentUser() user: CurrentUserData,
    @Param("variantId") variantId: string,
  ) {
    return this.stockService.getStockByVariant(user.tenantId, variantId);
  }

  @Get("movements")
  @ApiOperation({ summary: "Get movement history" })
  @ApiQuery({ name: "variantId", required: false })
  @ApiQuery({ name: "locationId", required: false })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getMovements(
    @CurrentUser() user: CurrentUserData,
    @Query("variantId") variantId?: string,
    @Query("locationId") locationId?: string,
    @Query("limit") limit?: number,
  ) {
    return this.stockService.getMovementHistory(user.tenantId, variantId, locationId, limit || 50);
  }
}
