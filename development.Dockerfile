# syntax=docker/dockerfile:1
ARG NODE_VERSION=24.21.0
FROM node:${NODE_VERSION}-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS builder

WORKDIR /app

# System tools, installed once (cached layer).
RUN apt update && apt install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Dependency manifests only, so the install layer stays cached until they change.
COPY package.json package-lock.json ./

# MAIR-436: the GitHub Packages token is a required BuildKit secret used only by the install.
# A readonly bind keeps the tracked npm policy without writing the token into a layer.
RUN --mount=type=secret,id=node_auth_token,env=NODE_AUTH_TOKEN,required=true \
    --mount=type=bind,source=.npmrc,target=/app/.npmrc \
    npm ci

# Application sources (synced by `docker compose watch`).
COPY . .

# Non-root user, set last.
RUN useradd --system --home /app --shell /usr/sbin/nologin projects && \
    chown -R projects:projects /app

USER projects
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]
