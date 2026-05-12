# Monitoring & Observabilite

## Vue d'ensemble

LIBITEX expose plusieurs surfaces de monitoring :

| Surface | Outil | Configuration |
|---------|-------|---------------|
| Erreurs application | Sentry (auto-capture) | `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` |
| Health endpoints | HTTP `/api/v1/health/*` | Built-in (Docker healthcheck) |
| Health Docker | `docker compose ps` | `healthcheck:` in compose |
| Realtime WebSocket | Sentry breadcrumbs | Auto (logged on disconnect) |
| Performance | Sentry traces | `tracesSampleRate: 0.1` |

---

## Sentry

### Init

- **Backend** : `apps/api/src/common/sentry/sentry.ts` (`initSentryServer()` appele dans `main.ts` avant `NestFactory`).
- **Frontend** : `apps/web-merchant/src/lib/sentry.ts` (`initSentryClient()` appele dans `AuthProvider`).

### Filtres

- 4xx (auth, 404, validation) **ignores** — erreurs metier, pas des bugs.
- Erreurs reseau benignes ignorees : `AbortError`, `ChunkLoadError`, `ECONNRESET`...
- Rate limit : max 10 events/min/signature (memoire process). Protege le dashboard d'un crashloop.

### Release tracking

Le `release` Sentry est inline au build via :
- `NEXT_PUBLIC_APP_VERSION` (frontend, build arg)
- `APP_VERSION` (backend, env var)

Le `deploy.sh` exporte `APP_VERSION=$(git rev-parse --short HEAD)` avant le `docker compose build`. Permet de :
- Filtrer les erreurs par version dans le dashboard Sentry
- Detecter une regression liee a un deploy specifique
- Comparer le taux d'erreur entre deux releases

---

## Health checks

### Endpoints

| Endpoint | Usage | Latency moyenne |
|----------|-------|-----------------|
| `GET /api/v1/health` | Status complet (uptime + DB ping) | ~250ms (Neon HTTP) |
| `GET /api/v1/health/live` | Liveness probe (process responsif) | <10ms |
| `GET /api/v1/health/ready` | Readiness (DB SELECT 1) | ~250ms |

Tous ces endpoints :
- `@SkipThrottle()` (pas de rate limit, Docker check chaque 15s)
- `Cache-Control: no-store, must-revalidate` (jamais cache)

### Docker

```yaml
api:
  healthcheck:
    test: ["CMD-SHELL", "wget -q -O- http://localhost:3000/api/v1/health/live || exit 1"]
    interval: 15s
    timeout: 5s
    retries: 3
    start_period: 30s
```

Docker affiche le statut dans `docker compose ps` :
- `(healthy)` : 3 derniers checks OK
- `(starting)` : encore dans `start_period`
- `(unhealthy)` : 3 derniers checks KO -> Docker peut restart auto

---

## Monitoring uptime externe

Le `restart: unless-stopped` de Docker assure le redemarrage automatique. Pour une **alerte externe** en cas de panne complete (Docker daemon, VPS reboot, DNS), recommandations :

### Option A : Uptime Kuma (self-hosted)

Container Docker sur le meme VPS ou un VPS secondaire, ~50 MB RAM. Verifie chaque 1-5 min, alerte Telegram/Discord/email.

```yaml
# docker-compose.yml additionnel
services:
  uptime:
    image: louislam/uptime-kuma:1
    volumes: [uptime-data:/app/data]
    ports: ["127.0.0.1:3001:3001"]
    restart: unless-stopped
```

Configurer 3 checks :
- `https://libitex-api.lunion-lab.com/api/v1/health/live` (toutes les 60s)
- `https://libitex-pro.lunion-lab.com/` (toutes les 5 min)
- `https://libitex-storage.lunion-lab.com/minio/health/ready` (toutes les 5 min)

### Option B : Service SaaS

- [UptimeRobot](https://uptimerobot.com/) — gratuit 50 monitors, intervalle 5 min.
- [Better Uptime](https://betteruptime.com/) — payant mais 1-3 min, status page incluse.
- [Pingdom](https://www.pingdom.com/) — payant, monitoring multi-region.

---

## Logs & investigation

### Voir les logs

```bash
# API
docker compose -f docker-compose.prod.yml logs -f api --tail=200

# Frontend
docker compose -f docker-compose.prod.yml logs -f web --tail=200

# Tout
./deploy.sh logs
```

### Logs structures (future)

Pour migrer vers un logger structure JSON (parsable par Loki/CloudWatch/Datadog), envisager Pino. Pas critique tant que `docker compose logs` reste pratiquable. A reconsiderer au-dela de ~3 instances API.

---

## Investigation incident

1. **Symptome utilisateur** -> chercher dans Sentry : filtre par release (commit SHA), tenant, environment.
2. **Stack trace Sentry** -> identifier le commit fautif. Si recent, considerer rollback :
   ```bash
   git revert <bad-commit>
   git push origin main
   # deploy auto via GitHub Actions
   ```
3. **API down** -> verifier health : `curl https://libitex-api.lunion-lab.com/api/v1/health`.
   - `db.status: down` -> incident Neon (verifier https://neonstatus.com).
   - `uptimeSeconds < 60` -> restart recent, regarder les logs Docker.
4. **Slow** -> Sentry Performance (10% sample) montre les transactions lentes par endpoint.
