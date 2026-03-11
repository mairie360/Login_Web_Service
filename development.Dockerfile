ARG NODE_VERSION=23.10.0
FROM node:${NODE_VERSION}-bookworm-slim AS builder

WORKDIR /app

# 1. On installe les outils système nécessaires une seule fois (CACHÉ)
RUN apt update && apt install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# 2. ON COPIE UNIQUEMENT les fichiers de dépendances (CACHÉ tant que tu n'ajoutes pas de lib)
COPY package.json package-lock.json ./

# 3. On utilise un "mount" de type secret pour l'installation
# Cela permet d'utiliser ton NODE_AUTH_TOKEN sans qu'il reste dans l'image finale
RUN --mount=type=secret,id=NODE_AUTH_TOKEN \
    export TOKEN=$(cat /run/secrets/NODE_AUTH_TOKEN) && \
    npm config set //npm.pkg.github.com/:_authToken=$TOKEN && \
    npm install

# 4. On copie le reste du code (C'est ici que tu travailles)
COPY . .

# 5. On gère les permissions à la fin
RUN useradd --system --home /app --shell /usr/sbin/nologin projects && \
    chown -R projects:projects /app

USER projects
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]