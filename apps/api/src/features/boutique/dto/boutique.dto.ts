import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsEmail, IsEnum, IsArray } from "class-validator";
import { ActivitySector, ProductType } from "@libitex/shared";

export class ModifierBoutiqueDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  devise?: string;

  @ApiPropertyOptional({ enum: ActivitySector })
  @IsEnum(ActivitySector)
  @IsOptional()
  secteurActivite?: ActivitySector;

  @ApiPropertyOptional({ enum: ProductType, isArray: true })
  @IsArray()
  @IsEnum(ProductType, { each: true })
  @IsOptional()
  typesProduitsAutorises?: ProductType[];

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  adresse?: string;
}

export class BoutiqueDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nom!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ActivitySector })
  secteurActivite!: ActivitySector;

  @ApiProperty({ enum: ProductType, isArray: true })
  typesProduitsAutorises!: ProductType[];

  @ApiProperty()
  devise!: string;

  @ApiProperty({ required: false, nullable: true })
  email!: string | null;

  @ApiProperty({ required: false, nullable: true })
  telephone!: string | null;

  @ApiProperty({ required: false, nullable: true })
  adresse!: string | null;
}
