import { Logger } from "@nestjs/common";
import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

/**
 * Gateway temps reel : connecte les clients via Socket.io, authentifie
 * par JWT (passe en handshake.auth.token), les met dans une room par
 * tenantId pour qu'un event broadcaste a un tenant ne soit pas vu par
 * les autres.
 *
 * Events emis aux clients :
 *  - stock.updated     : un mouvement de stock vient d'avoir lieu
 *  - ticket.completed  : un ticket vient d'etre encaisse
 *  - produit.changed   : creer/modifier/supprimer un produit
 *  - disponibilites.changed : les portions servables changent (ingrédient ou stock supplément modifié)
 *
 * Le client utilise ces events pour invalider les queries TanStack
 * et raffraichir l'UI en < 1s sans polling.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  path: "/socket.io",
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        socket.disconnect(true);
        return;
      }
      const payload = await this.jwt.verifyAsync<{ sub: string; tenantId: string }>(token, {
        secret: this.config.getOrThrow<string>("JWT_SECRET"),
      });
      const tenantId = payload.tenantId;
      socket.data.tenantId = tenantId;
      socket.data.userId = payload.sub;
      await socket.join(`tenant:${tenantId}`);
      this.logger.log(`Client connecte tenant=${tenantId} user=${payload.sub}`);
    } catch (err) {
      this.logger.warn(`Connexion refusee : ${(err as Error).message}`);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const tenantId = socket.data?.tenantId;
    if (tenantId) this.logger.log(`Client deconnecte tenant=${tenantId}`);
  }

  /** Broadcast a tous les clients d'un tenant donne. */
  emitToTenant(tenantId: string, event: string, payload?: unknown): void {
    this.server.to(`tenant:${tenantId}`).emit(event, payload ?? {});
  }
}
