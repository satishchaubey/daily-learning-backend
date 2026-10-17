# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Production Minimal Image (<80MB RAM)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
RUN npm install --only=production --legacy-peer-deps

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database ./src/database

EXPOSE 4000

# Strict memory limit for AWS Free Tier EC2 t2.micro / t3.micro (1GB RAM)
CMD ["node", "--max-old-space-size=512", "dist/main.js"]
