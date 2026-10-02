# syntax=docker/dockerfile:1
# MAIR-436: keep the exact Node release aligned with all frontend CI workflows.
ARG NODE_VERSION=24.21.0
FROM node:${NODE_VERSION}-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS dependencies
WORKDIR /app

# Keep the tracked npm policy read-only and the existing CI credential ephemeral.
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=node_auth_token,env=NODE_AUTH_TOKEN,required=true \
    --mount=type=bind,source=.npmrc,target=/app/.npmrc \
    npm ci

# Copie du code source et build
FROM dependencies AS builder
COPY . .
RUN npm run build

# --- Runtime base: only Node and the existing healthcheck are needed. ---
FROM node:${NODE_VERSION}-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS runtime-base
WORKDIR /app

# Sécurité & Healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-v1.22.22 \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 nextjs

# --- Standalone runner ---
FROM runtime-base AS runner
# Configuration de l'environnement
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=5000

# On copie le dossier standalone qui contient déjà son propre node_modules
# Note: Assure-toi que "output: 'standalone'" est bien activé dans ton next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 5000

CMD ["node", "server.js"]
