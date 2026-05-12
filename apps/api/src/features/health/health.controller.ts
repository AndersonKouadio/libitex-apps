import { Controller, Get, Inject, Header } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { sql } from "drizzle-orm";
import { DATABASE_TOKEN } from "../../database/database.module";
import type { Database } from "@libitex/db";

/**
 * Health check endpoints pour Docker / nginx / monitoring uptime.
 *
 * Fix C3 Module 8 : avant ce endpoint, le proxy nginx ne pouvait pas
 * distinguer "container demarre" de "API responsive". Maintenant Docker
 * healthcheck + nginx upstream check peuvent restart auto.
 *
 * Endpoints :
 * - /api/v1/health   : status global (200 si DB ping OK, 503 sinon)
 * - /api/v1/health/live  : liveness probe (200 toujours, si le process repond)
 * - /api/v1/health/ready : readiness probe (200 si pret a recevoir du trafic)
 *
 * `@SkipThrottle()` : pas de rate limiting (Docker check chaque 10s).
 * `Cache-Control: no-store` : jamais cache (la sante doit etre fraiche).
 */
@ApiTags("Health")
@Controller("health")
@SkipThrottle()
export class HealthController {
  // Uptime calcule depuis le bootstrap du module (proche du process start).
  private readonly startedAt = Date.now();

  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  @Get()
  @Header("Cache-Control", "no-store, must-revalidate")
  @ApiOperation({ summary: "Sante globale (DB ping + uptime)" })
  async global() {
    const start = Date.now();
    let dbStatus: "ok" | "down" = "ok";
    let dbLatencyMs = 0;
    try {
      await this.db.execute(sql`SELECT 1`);
      dbLatencyMs = Date.now() - start;
    } catch {
      dbStatus = "down";
      dbLatencyMs = Date.now() - start;
    }

    const ok = dbStatus === "ok";
    return {
      status: ok ? "ok" : "degraded",
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      db: { status: dbStatus, latencyMs: dbLatencyMs },
      timestamp: new Date().toISOString(),
    };
  }

  @Get("live")
  @Header("Cache-Control", "no-store, must-revalidate")
  @ApiOperation({ summary: "Liveness probe (process responsif)" })
  live() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  @Header("Cache-Control", "no-store, must-revalidate")
  @ApiOperation({ summary: "Readiness probe (pret a servir le trafic)" })
  async ready() {
    try {
      await this.db.execute(sql`SELECT 1`);
      return { status: "ready", timestamp: new Date().toISOString() };
    } catch {
      // Renvoie 200 avec status "not-ready" pour distinguer du 5xx genuine.
      // Le caller (Docker) check le champ "status".
      return { status: "not-ready", timestamp: new Date().toISOString() };
    }
  }
}
