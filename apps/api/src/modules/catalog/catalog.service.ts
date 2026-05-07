import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, isNull } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../database/database.module";
import { type Database, products, variants, categories } from "@libitex/db";
import { CreateProductDto, UpdateProductDto, CreateCategoryDto } from "./dto/catalog.dto";

@Injectable()
export class CatalogService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  // ─── Categories ───

  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const [category] = await this.db
      .insert(categories)
      .values({
        tenantId,
        name: dto.name,
        slug,
        parentId: dto.parentId,
      })
      .returning();

    return category;
  }

  async listCategories(tenantId: string) {
    return this.db.query.categories.findMany({
      where: and(eq(categories.tenantId, tenantId), isNull(categories.deletedAt)),
      orderBy: categories.sortOrder,
    });
  }

  // ─── Products ───

  async createProduct(tenantId: string, dto: CreateProductDto) {
    // Create product
    const [product] = await this.db
      .insert(products)
      .values({
        tenantId,
        name: dto.name,
        description: dto.description,
        productType: dto.productType,
        categoryId: dto.categoryId,
        brand: dto.brand,
        barcodeEan13: dto.barcodeEan13,
        taxRate: dto.taxRate?.toString(),
        images: dto.images || [],
      })
      .returning();

    // Create variants
    const createdVariants = [];
    for (const v of dto.variants) {
      const [variant] = await this.db
        .insert(variants)
        .values({
          productId: product.id,
          sku: v.sku,
          name: v.name,
          attributes: v.attributes || {},
          barcode: v.barcode,
          pricePurchase: v.pricePurchase?.toString() || "0",
          priceRetail: v.priceRetail.toString(),
          priceWholesale: v.priceWholesale?.toString(),
          priceVip: v.priceVip?.toString(),
        })
        .returning();

      createdVariants.push(variant);
    }

    return { ...product, variants: createdVariants };
  }

  async findProduct(tenantId: string, productId: string) {
    const product = await this.db.query.products.findFirst({
      where: and(
        eq(products.id, productId),
        eq(products.tenantId, tenantId),
        isNull(products.deletedAt),
      ),
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const productVariants = await this.db.query.variants.findMany({
      where: and(eq(variants.productId, productId), isNull(variants.deletedAt)),
    });

    return { ...product, variants: productVariants };
  }

  async listProducts(tenantId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const data = await this.db.query.products.findMany({
      where: and(eq(products.tenantId, tenantId), isNull(products.deletedAt)),
      limit,
      offset,
      orderBy: products.createdAt,
    });

    return { data, meta: { page, limit } };
  }

  async updateProduct(tenantId: string, productId: string, dto: UpdateProductDto) {
    // Verify ownership
    await this.findProduct(tenantId, productId);

    const [updated] = await this.db
      .update(products)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDeleteProduct(tenantId: string, productId: string) {
    await this.findProduct(tenantId, productId);

    await this.db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));

    return { deleted: true };
  }
}
