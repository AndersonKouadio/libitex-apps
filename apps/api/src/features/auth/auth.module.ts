import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import type { StringValue } from "ms";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { MfaService } from "./mfa.service";
import { UtilisateurRepository } from "./repositories/utilisateur.repository";
import { MembershipRepository } from "./repositories/membership.repository";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { StockModule } from "../stock/stock.module";

@Module({
  imports: [
    StockModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          // ms.StringValue : format attendu par jsonwebtoken (ex: "15m", "1h", "7d")
          expiresIn: config.get<string>("JWT_EXPIRES_IN", "15m") as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, MfaService, UtilisateurRepository, MembershipRepository, JwtStrategy],
  exports: [AuthService, UtilisateurRepository, MembershipRepository],
})
export class AuthModule {}
