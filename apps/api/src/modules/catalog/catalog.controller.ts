import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { CatalogService } from "./catalog.service";
import { CreateProductDto, UpdateProductDto, CreateCategoryDto } from "./dto/catalog.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("Catalog")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // ─── Categories ───

  @Post("categories")
  @ApiOperation({ summary: "Create a category" })
  @Roles("ADMIN", "MANAGER")
  async createCategory(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.catalogService.createCategory(user.tenantId, dto);
  }

  @Get("categories")
  @ApiOperation({ summary: "List all categories" })
  async listCategories(@CurrentUser() user: CurrentUserData) {
    return this.catalogService.listCategories(user.tenantId);
  }

  // ─── Products ───

  @Post("products")
  @ApiOperation({ summary: "Create a product with variants" })
  @Roles("ADMIN", "MANAGER")
  async createProduct(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateProductDto,
  ) {
    return this.catalogService.createProduct(user.tenantId, dto);
  }

  @Get("products")
  @ApiOperation({ summary: "List products (paginated)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async listProducts(
    @CurrentUser() user: CurrentUserData,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.catalogService.listProducts(user.tenantId, page || 1, limit || 20);
  }

  @Get("products/:id")
  @ApiOperation({ summary: "Get a product by ID with its variants" })
  async findProduct(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
  ) {
    return this.catalogService.findProduct(user.tenantId, id);
  }

  @Patch("products/:id")
  @ApiOperation({ summary: "Update a product" })
  @Roles("ADMIN", "MANAGER")
  async updateProduct(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalogService.updateProduct(user.tenantId, id, dto);
  }

  @Delete("products/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft delete a product" })
  @Roles("ADMIN", "MANAGER")
  async deleteProduct(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
  ) {
    return this.catalogService.softDeleteProduct(user.tenantId, id);
  }
}
