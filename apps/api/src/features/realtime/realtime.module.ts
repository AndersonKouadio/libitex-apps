import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { RealtimeGateway } from "./realtime.gateway";

/**
 * Module realtime : expose RealtimeGateway pour que les autres modules
 * (vente, stock, catalogue...) puissent broadcaster des events apres
 * leurs actions. Re-déclare JwtModule pour pouvoir verifier le token
 * au handshake (Auth ne l'exporte pas).
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
      }),
    }),
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
