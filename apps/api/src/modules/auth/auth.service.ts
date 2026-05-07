import { Injectable, UnauthorizedException, ConflictException, Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../database/database.module";
import { type Database, users, tenants } from "@libitex/db";
import { LoginDto, RegisterDto, AuthResponse, TokenPayload } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if tenant slug exists
    const existingTenant = await this.db.query.tenants.findFirst({
      where: eq(tenants.slug, dto.tenantSlug),
    });
    if (existingTenant) {
      throw new ConflictException("Tenant slug already exists");
    }

    // Check if email exists
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    // Create tenant
    const [tenant] = await this.db
      .insert(tenants)
      .values({
        name: dto.tenantName,
        slug: dto.tenantSlug,
        email: dto.email,
        currency: dto.currency || "XOF",
      })
      .returning();

    // Create admin user
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const [user] = await this.db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: "ADMIN",
      })
      .returning();

    // Generate tokens
    return this.generateTokens(user.id, tenant.id, user.role);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.db.query.users.findFirst({
      where: and(eq(users.email, dto.email), eq(users.isActive, true)),
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Update last login
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return this.generateTokens(user.id, user.tenantId, user.role);
  }

  async refreshToken(userId: string, tenantId: string, role: string): Promise<AuthResponse> {
    return this.generateTokens(userId, tenantId, role);
  }

  private async generateTokens(
    userId: string,
    tenantId: string,
    role: string,
  ): Promise<AuthResponse> {
    const payload: TokenPayload = { sub: userId, tenantId, role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get<string>("JWT_REFRESH_EXPIRES_IN", "7d") as any,
    });

    // Store refresh token hash
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.db
      .update(users)
      .set({ refreshToken: refreshHash })
      .where(eq(users.id, userId));

    return {
      accessToken,
      refreshToken,
      user: { id: userId, tenantId, role },
    };
  }
}
