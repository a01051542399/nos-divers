# ── Build Stage ────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build server
RUN pnpm build:server

# ── Production Stage ──────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm for production deps
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built server
COPY --from=builder /app/dist ./dist

# Copy drizzle migrations
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/server.js"]
