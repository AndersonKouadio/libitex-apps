import { Injectable, Inject, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and, sql, isNull } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../database/database.module";
import { type Database, locations, stockMovements } from "@libitex/db";
import { CreateLocationDto, StockInDto, StockAdjustmentDto, TransferRequestDto } from "./dto/stock.dto";

@Injectable()
export class StockService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  // ─── Locations ───

  async createLocation(tenantId: string, dto: CreateLocationDto) {
    const [location] = await this.db
      .insert(locations)
      .values({
        tenantId,
        name: dto.name,
        type: dto.type || "STORE",
        address: dto.address,
        parentId: dto.parentId,
      })
      .returning();
    return location;
  }

  async listLocations(tenantId: string) {
    return this.db.query.locations.findMany({
      where: and(eq(locations.tenantId, tenantId), isNull(locations.deletedAt)),
    });
  }

  // ─── Stock Movements (Event Sourcing) ───

  async stockIn(tenantId: string, userId: string, dto: StockInDto) {
    const [movement] = await this.db
      .insert(stockMovements)
      .values({
        tenantId,
        variantId: dto.variantId,
        locationId: dto.locationId,
        movementType: "STOCK_IN",
        quantity: dto.quantity,
        note: dto.note,
        batchId: dto.batchId,
        serialId: dto.serialId,
        userId,
      })
      .returning();
    return movement;
  }

  async stockOut(tenantId: string, userId: string, variantId: string, locationId: string, quantity: number, referenceType?: string, referenceId?: string, serialId?: string, batchId?: string) {
    // Verify stock availability
    const currentQty = await this.getCurrentStock(tenantId, variantId, locationId);
    if (currentQty < quantity) {
      throw new BadRequestException(
        `Insufficient stock: ${currentQty} available, ${quantity} requested`,
      );
    }

    const [movement] = await this.db
      .insert(stockMovements)
      .values({
        tenantId,
        variantId,
        locationId,
        movementType: "STOCK_OUT",
        quantity: -quantity, // Negative for outgoing
        referenceType,
        referenceId,
        serialId,
        batchId,
        userId,
      })
      .returning();
    return movement;
  }

  async adjust(tenantId: string, userId: string, dto: StockAdjustmentDto) {
    const [movement] = await this.db
      .insert(stockMovements)
      .values({
        tenantId,
        variantId: dto.variantId,
        locationId: dto.locationId,
        movementType: "ADJUSTMENT",
        quantity: dto.quantity, // Can be positive or negative
        note: dto.note,
        userId,
      })
      .returning();
    return movement;
  }

  async transfer(tenantId: string, userId: string, dto: TransferRequestDto) {
    // Verify stock at source
    const currentQty = await this.getCurrentStock(tenantId, dto.variantId, dto.fromLocationId);
    if (currentQty < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock at source: ${currentQty} available, ${dto.quantity} requested`,
      );
    }

    // TRANSFER_OUT from source (negative)
    const [outMovement] = await this.db
      .insert(stockMovements)
      .values({
        tenantId,
        variantId: dto.variantId,
        locationId: dto.fromLocationId,
        movementType: "TRANSFER_OUT",
        quantity: -dto.quantity,
        note: dto.note,
        userId,
      })
      .returning();

    // TRANSFER_IN to destination (positive)
    const [inMovement] = await this.db
      .insert(stockMovements)
      .values({
        tenantId,
        variantId: dto.variantId,
        locationId: dto.toLocationId,
        movementType: "TRANSFER_IN",
        quantity: dto.quantity,
        note: dto.note,
        userId,
      })
      .returning();

    return { out: outMovement, in: inMovement };
  }

  // ─── Current Stock (computed from events) ───

  async getCurrentStock(tenantId: string, variantId: string, locationId: string): Promise<number> {
    const result = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${stockMovements.quantity}), 0)`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenantId, tenantId),
          eq(stockMovements.variantId, variantId),
          eq(stockMovements.locationId, locationId),
        ),
      );
    return Number(result[0]?.total ?? 0);
  }

  async getStockByLocation(tenantId: string, locationId: string) {
    const result = await this.db
      .select({
        variantId: stockMovements.variantId,
        quantity: sql<number>`SUM(${stockMovements.quantity})`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenantId, tenantId),
          eq(stockMovements.locationId, locationId),
        ),
      )
      .groupBy(stockMovements.variantId);

    return result.map((r) => ({
      variantId: r.variantId,
      quantity: Number(r.quantity),
    }));
  }

  async getStockByVariant(tenantId: string, variantId: string) {
    const result = await this.db
      .select({
        locationId: stockMovements.locationId,
        quantity: sql<number>`SUM(${stockMovements.quantity})`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenantId, tenantId),
          eq(stockMovements.variantId, variantId),
        ),
      )
      .groupBy(stockMovements.locationId);

    return result.map((r) => ({
      locationId: r.locationId,
      quantity: Number(r.quantity),
    }));
  }

  async getMovementHistory(tenantId: string, variantId?: string, locationId?: string, limit = 50) {
    const conditions = [eq(stockMovements.tenantId, tenantId)];
    if (variantId) conditions.push(eq(stockMovements.variantId, variantId));
    if (locationId) conditions.push(eq(stockMovements.locationId, locationId));

    return this.db.query.stockMovements.findMany({
      where: and(...conditions),
      limit,
      orderBy: sql`${stockMovements.createdAt} DESC`,
    });
  }
}
