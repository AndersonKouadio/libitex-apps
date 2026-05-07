# ── Stage 1: Install + Build ──
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/web-merchant/package.json apps/web-merchant/

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/web-merchant apps/web-merchant
COPY tsconfig.base.json ./

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/web-merchant
RUN pnpm exec next build

# ── Stage 2: Run ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Le standalone d'un monorepo garde la structure du workspace
COPY --from=builder /app/apps/web-merchant/public ./apps/web-merchant/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-merchant/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-merchant/.next/static ./apps/web-merchant/.next/static

USER nextjs

EXPOSE 3001

WORKDIR /app/apps/web-merchant

CMD ["node", "server.js"]
