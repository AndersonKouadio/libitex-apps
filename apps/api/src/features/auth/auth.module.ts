import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UtilisateurRepository } from "./repositories/utilisateur.repository";
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
          expiresIn: config.get<string>("JWT_EXPIRES_IN", "15m") as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UtilisateurRepository, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
