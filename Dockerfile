# Stage 1: build the React/Vite frontend
FROM node:20-alpine AS builder
WORKDIR /app
# better-sqlite3 es un módulo nativo: necesita toolchain para compilar.
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: production — only server runtime + built dist
FROM node:20-alpine
WORKDIR /app
# El toolchain también hace falta acá porque `npm ci --omit=dev` recompila better-sqlite3.
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server.js seeds.js db.js models.js ./
RUN mkdir -p /app/data
EXPOSE 5050
ENV NODE_ENV=production
ENV DB_PATH=/app/data/tuia.db
CMD ["node", "server.js"]
