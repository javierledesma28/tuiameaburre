# Stage 1: build the React/Vite frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: production — only server runtime + built dist
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server.js seeds.js ./
EXPOSE 5050
ENV NODE_ENV=production
CMD ["node", "server.js"]
