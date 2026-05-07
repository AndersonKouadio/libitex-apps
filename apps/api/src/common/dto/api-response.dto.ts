import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PaginationMeta {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}

export class PaginatedResponseDto<T> {
  data!: T[];
  meta!: PaginationMeta;

  static create<T>(data: T[], total: number, page: number, limit: number): PaginatedResponseDto<T> {
    const res = new PaginatedResponseDto<T>();
    res.data = data;
    res.meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
    return res;
  }
}

export class ApiResponseDto<T> {
  @ApiProperty() success!: boolean;
  @ApiPropertyOptional() data?: T;
  @ApiPropertyOptional() message?: string;
  @ApiPropertyOptional() error?: string;

  static ok<T>(data: T, message?: string): ApiResponseDto<T> {
    const res = new ApiResponseDto<T>();
    res.success = true;
    res.data = data;
    res.message = message;
    return res;
  }

  static fail(error: string): ApiResponseDto<never> {
    const res = new ApiResponseDto<never>();
    res.success = false;
    res.error = error;
    return res;
  }
}
