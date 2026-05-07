import { Injectable, Inject, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and, sql, desc } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../database/database.module";
import {
  type Database, tickets, ticketLines, ticketPayments,
  variants, products, serials, batches,
} from "@libitex/db";
import { StockService } from "../stock/stock.service";
import { CreateTicketDto, CompleteTicketDto, AddLineDto } from "./dto/pos.dto";

@Injectable()
export class PosService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly stockService: StockService,
  ) {}

  // ─── Generate ticket number ───

  private async generateTicketNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    // Count today's tickets
    const result = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          sql`DATE(${tickets.createdAt}) = CURRENT_DATE`,
        ),
      );

    const seq = Number(result[0]?.count ?? 0) + 1;
    return `TK-${datePrefix}-${String(seq).padStart(4, "0")}`;
  }

  // ─── Resolve variant with product type info ───

  private async resolveVariant(variantId: string) {
    const variant = await this.db.query.variants.findFirst({
      where: eq(variants.id, variantId),
    });
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);

    const product = await this.db.query.products.findFirst({
      where: eq(products.id, variant.productId),
    });
    if (!product) throw new NotFoundException(`Product for variant ${variantId} not found`);

    return { variant, product };
  }

  // ─── FEFO: get oldest batch for PERISHABLE ───

  private async getFefoBatch(variantId: string): Promise<{ id: string; batchNumber: string } | null> {
    const batch = await this.db.query.batches.findFirst({
      where: and(
        eq(batches.variantId, variantId),
        sql`${batches.quantityRemaining} > 0`,
      ),
      orderBy: batches.expiryDate, // ASC = First Expired
    });
    return batch ? { id: batch.id, batchNumber: batch.batchNumber } : null;
  }

  // ─── Create Ticket (Open) ───

  async createTicket(tenantId: string, userId: string, dto: CreateTicketDto) {
    const ticketNumber = await this.generateTicketNumber(tenantId);

    // Create ticket
    const [ticket] = await this.db
      .insert(tickets)
      .values({
        tenantId,
        locationId: dto.locationId,
        userId,
        ticketNumber,
        status: "OPEN",
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        note: dto.note,
      })
      .returning();

    // Process each line according to product type
    let subtotal = 0;
    let totalTax = 0;
    const createdLines = [];

    for (const line of dto.lines) {
      const { variant, product } = await this.resolveVariant(line.variantId);
      const unitPrice = line.unitPrice ?? Number(variant.priceRetail);
      const discount = line.discount ?? 0;
      const taxRate = Number(product.taxRate ?? 0);
      const lineSubtotal = unitPrice * line.quantity - discount;
      const lineTax = lineSubtotal * (taxRate / 100);
      const lineTotal = lineSubtotal + lineTax;

      let serialNumber = line.serialNumber;
      let serialId: string | undefined;
      let batchId: string | undefined;
      let batchNumber: string | undefined;

      // Type-specific logic
      switch (product.productType) {
        case "SERIALIZED":
          if (!line.serialNumber) {
            throw new BadRequestException(
              `Serial number required for product "${product.name}" (SERIALIZED)`,
            );
          }
          // Find and validate serial
          const serial = await this.db.query.serials.findFirst({
            where: and(
              eq(serials.variantId, variant.id),
              eq(serials.serialNumber, line.serialNumber),
              eq(serials.status, "IN_STOCK"),
            ),
          });
          if (!serial) {
            throw new BadRequestException(
              `Serial "${line.serialNumber}" not found or not in stock`,
            );
          }
          serialId = serial.id;
          serialNumber = serial.serialNumber;
          break;

        case "PERISHABLE":
          // FEFO: auto-select oldest batch
          const fefoBatch = await this.getFefoBatch(variant.id);
          if (!fefoBatch) {
            throw new BadRequestException(
              `No available batch for perishable product "${product.name}"`,
            );
          }
          batchId = fefoBatch.id;
          batchNumber = fefoBatch.batchNumber;
          break;

        // SIMPLE and VARIANT: no special handling
      }

      const [ticketLine] = await this.db
        .insert(ticketLines)
        .values({
          ticketId: ticket.id,
          variantId: variant.id,
          productName: product.name,
          variantName: variant.name,
          sku: variant.sku,
          quantity: line.quantity,
          unitPrice: unitPrice.toString(),
          discount: discount.toString(),
          taxRate: taxRate.toString(),
          taxAmount: lineTax.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
          serialNumber,
          serialId,
          batchId,
          batchNumber,
        })
        .returning();

      subtotal += lineSubtotal;
      totalTax += lineTax;
      createdLines.push(ticketLine);
    }

    const total = subtotal + totalTax;

    // Update ticket totals
    const [updatedTicket] = await this.db
      .update(tickets)
      .set({
        subtotal: subtotal.toFixed(2),
        taxAmount: totalTax.toFixed(2),
        total: total.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticket.id))
      .returning();

    return { ...updatedTicket, lines: createdLines };
  }

  // ─── Complete Ticket (Pay & Decrement Stock) ───

  async completeTicket(tenantId: string, userId: string, ticketId: string, dto: CompleteTicketDto) {
    // Load ticket
    const ticket = await this.db.query.tickets.findFirst({
      where: and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)),
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    if (ticket.status !== "OPEN" && ticket.status !== "PARKED") {
      throw new BadRequestException(`Ticket is ${ticket.status}, cannot complete`);
    }

    // Validate payment total
    const totalPaid = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    const ticketTotal = Number(ticket.total);
    if (totalPaid < ticketTotal) {
      throw new BadRequestException(
        `Insufficient payment: ${totalPaid} paid, ${ticketTotal} required`,
      );
    }

    // Record payments
    for (const payment of dto.payments) {
      await this.db.insert(ticketPayments).values({
        ticketId: ticket.id,
        method: payment.method,
        amount: payment.amount.toString(),
        reference: payment.reference,
      });
    }

    // Load lines and decrement stock
    const lines = await this.db.query.ticketLines.findMany({
      where: eq(ticketLines.ticketId, ticket.id),
    });

    for (const line of lines) {
      // Decrement stock via event
      await this.stockService.stockOut(
        tenantId,
        userId,
        line.variantId,
        ticket.locationId,
        line.quantity,
        "TICKET",
        ticket.id,
        line.serialId ?? undefined,
        line.batchId ?? undefined,
      );

      // Mark serial as SOLD
      if (line.serialId) {
        await this.db
          .update(serials)
          .set({ status: "SOLD", saleId: ticket.id, updatedAt: new Date() })
          .where(eq(serials.id, line.serialId));
      }

      // Decrement batch quantity
      if (line.batchId) {
        await this.db
          .update(batches)
          .set({
            quantityRemaining: sql`${batches.quantityRemaining} - ${line.quantity}`,
          })
          .where(eq(batches.id, line.batchId));
      }
    }

    // Mark ticket completed
    const [completed] = await this.db
      .update(tickets)
      .set({
        status: "COMPLETED",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticket.id))
      .returning();

    return {
      ...completed,
      lines,
      payments: dto.payments,
      change: totalPaid - ticketTotal,
    };
  }

  // ─── Park / Void ───

  async parkTicket(tenantId: string, ticketId: string) {
    const [parked] = await this.db
      .update(tickets)
      .set({ status: "PARKED", updatedAt: new Date() })
      .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)))
      .returning();
    if (!parked) throw new NotFoundException("Ticket not found");
    return parked;
  }

  async voidTicket(tenantId: string, ticketId: string) {
    const ticket = await this.db.query.tickets.findFirst({
      where: and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)),
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    if (ticket.status === "COMPLETED") {
      throw new BadRequestException("Cannot void a completed ticket");
    }

    const [voided] = await this.db
      .update(tickets)
      .set({ status: "VOIDED", updatedAt: new Date() })
      .where(eq(tickets.id, ticketId))
      .returning();
    return voided;
  }

  // ─── Queries ───

  async getTicket(tenantId: string, ticketId: string) {
    const ticket = await this.db.query.tickets.findFirst({
      where: and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)),
    });
    if (!ticket) throw new NotFoundException("Ticket not found");

    const lines = await this.db.query.ticketLines.findMany({
      where: eq(ticketLines.ticketId, ticketId),
    });
    const payments = await this.db.query.ticketPayments.findMany({
      where: eq(ticketPayments.ticketId, ticketId),
    });

    return { ...ticket, lines, payments };
  }

  async listTickets(tenantId: string, locationId?: string, status?: string, page = 1, limit = 20) {
    const conditions = [eq(tickets.tenantId, tenantId)];
    if (locationId) conditions.push(eq(tickets.locationId, locationId));
    if (status) conditions.push(eq(tickets.status, status as any));

    const data = await this.db.query.tickets.findMany({
      where: and(...conditions),
      limit,
      offset: (page - 1) * limit,
      orderBy: desc(tickets.createdAt),
    });

    return { data, meta: { page, limit } };
  }

  // ─── Daily Z Report ───

  async zReport(tenantId: string, locationId: string, date?: string) {
    const targetDate = date || new Date().toISOString().split("T")[0];

    const result = await this.db
      .select({
        totalTickets: sql<number>`COUNT(*)`,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${tickets.total} AS NUMERIC)), 0)`,
        totalTax: sql<number>`COALESCE(SUM(CAST(${tickets.taxAmount} AS NUMERIC)), 0)`,
        totalDiscount: sql<number>`COALESCE(SUM(CAST(${tickets.discountAmount} AS NUMERIC)), 0)`,
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          eq(tickets.locationId, locationId),
          eq(tickets.status, "COMPLETED"),
          sql`DATE(${tickets.completedAt}) = ${targetDate}`,
        ),
      );

    // Payment breakdown
    const paymentBreakdown = await this.db
      .select({
        method: ticketPayments.method,
        total: sql<number>`COALESCE(SUM(CAST(${ticketPayments.amount} AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(ticketPayments)
      .innerJoin(tickets, eq(ticketPayments.ticketId, tickets.id))
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          eq(tickets.locationId, locationId),
          eq(tickets.status, "COMPLETED"),
          sql`DATE(${tickets.completedAt}) = ${targetDate}`,
        ),
      )
      .groupBy(ticketPayments.method);

    return {
      date: targetDate,
      locationId,
      summary: {
        totalTickets: Number(result[0]?.totalTickets ?? 0),
        totalRevenue: Number(result[0]?.totalRevenue ?? 0),
        totalTax: Number(result[0]?.totalTax ?? 0),
        totalDiscount: Number(result[0]?.totalDiscount ?? 0),
      },
      paymentBreakdown: paymentBreakdown.map((p) => ({
        method: p.method,
        total: Number(p.total),
        count: Number(p.count),
      })),
    };
  }
}
