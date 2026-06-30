# ----- Build stage -----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Installer les dépendances
COPY package*.json ./
RUN npm ci

# Copier le code et builder Nuxt
COPY . .
RUN npm run build

# ----- Runtime stage -----
FROM node:20-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production
# Nitro écoute sur ce port
ENV NITRO_PORT=3000
ENV HOST=0.0.0.0

# Copier uniquement la build Nuxt (preset node-server)
COPY --from=builder /app/.output ./.output

# User non-root
RUN useradd -m nodeuser && chown -R nodeuser:nodeuser /app
USER nodeuser

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
