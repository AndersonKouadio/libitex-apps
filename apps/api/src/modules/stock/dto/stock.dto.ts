import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsUUID, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { StockMovementType } from "@libitex/shared";

export class CreateLocationDto {
  @ApiProperty({ example: "Entrepot Central" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: "WAREHOUSE" })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parentId?: string;
}

export class StockInDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsUUID()
  locationId!: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: "For PERISHABLE products" })
  @IsUUID()
  @IsOptional()
  batchId?: string;

  @ApiPropertyOptional({ description: "For SERIALIZED products" })
  @IsUUID()
  @IsOptional()
  serialId?: string;
}

export class StockAdjustmentDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsUUID()
  locationId!: string;

  @ApiProperty({ example: -5, description: "Positive or negative" })
  @IsNumber()
  quantity!: number;

  @ApiProperty({ example: "Inventory adjustment - 5 units missing" })
  @IsString()
  @IsNotEmpty()
  note!: string;
}

export class TransferRequestDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsUUID()
  fromLocationId!: string;

  @ApiProperty()
  @IsUUID()
  toLocationId!: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}
