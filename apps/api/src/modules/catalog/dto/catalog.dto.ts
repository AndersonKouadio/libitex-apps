import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray,
  ValidateNested, IsBoolean, Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProductType } from "@libitex/shared";

// ─── Category ───

export class CreateCategoryDto {
  @ApiProperty({ example: "Electronics" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentId?: string;
}

// ─── Variant ───

export class CreateVariantDto {
  @ApiProperty({ example: "SKU-001" })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiPropertyOptional({ example: "Blue / M" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: { color: "Blue", size: "M" } })
  @IsOptional()
  attributes?: Record<string, string>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  pricePurchase?: number;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0)
  priceRetail!: number;

  @ApiPropertyOptional({ example: 12000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceWholesale?: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceVip?: number;
}

// ─── Product ───

export class CreateProductDto {
  @ApiProperty({ example: "Samsung Galaxy A15" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ProductType, example: ProductType.SIMPLE })
  @IsEnum(ProductType)
  productType!: ProductType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: "Samsung" })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  barcodeEan13?: string;

  @ApiPropertyOptional({ example: 18 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiProperty({ type: [CreateVariantDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  @IsArray()
  variants!: CreateVariantDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
