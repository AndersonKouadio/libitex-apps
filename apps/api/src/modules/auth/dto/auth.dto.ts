import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "admin@myboutique.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto {
  @ApiProperty({ example: "Ma Boutique" })
  @IsString()
  @IsNotEmpty()
  tenantName!: string;

  @ApiProperty({ example: "ma-boutique" })
  @IsString()
  @IsNotEmpty()
  tenantSlug!: string;

  @ApiProperty({ example: "admin@myboutique.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "securepassword" })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: "Amadou" })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: "Diallo" })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional({ example: "+221770001234" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "XOF" })
  @IsString()
  @IsOptional()
  currency?: string;
}

export class TokenPayload {
  sub!: string;
  tenantId!: string;
  role!: string;
}

export class AuthResponse {
  accessToken!: string;
  refreshToken!: string;
  user!: {
    id: string;
    tenantId: string;
    role: string;
  };
}
