import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsUUID,
  IsArray, ValidateNested, Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentMethod } from "@libitex/shared";

export class AddLineDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: "Override price (for discount)" })
  @IsNumber()
  @IsOptional()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ description: "For SERIALIZED products — IMEI/SN" })
  @IsString()
  @IsOptional()
  serialNumber?: string;
}

export class PaymentDto {
  @ApiProperty({ enum: PaymentMethod, example: "CASH" })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: "Mobile Money ref: TX123456" })
  @IsString()
  @IsOptional()
  reference?: string;
}

export class CreateTicketDto {
  @ApiProperty()
  @IsUUID()
  locationId!: string;

  @ApiProperty({ type: [AddLineDto] })
  @ValidateNested({ each: true })
  @Type(() => AddLineDto)
  @IsArray()
  lines!: AddLineDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

export class CompleteTicketDto {
  @ApiProperty({ type: [PaymentDto] })
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  @IsArray()
  payments!: PaymentDto[];
}
