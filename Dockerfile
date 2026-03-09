# --- Stage 1: Build ---
ARG NODE_VERSION=23.1.0
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app

# On déclare l'argument pour le token (passé via --build-arg dans ta CI)
ARG NODE_AUTH_TOKEN

# Optimisation du cache pour les dépendances
COPY package.json package-lock.json ./

# Configuration temporaire de npm pour le registre GitHub
# On crée un .npmrc à la volée, on installe, puis on le supprimera
RUN echo "@mairie360:registry=https://npm.pkg.github.com" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}" >> .npmrc && \
    npm ci && \
    rm .npmrc

# Copie du code source et build
COPY . .
RUN npm run build

# --- Stage 2: Runner ---
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app

# Sécurité & Healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 nextjs

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