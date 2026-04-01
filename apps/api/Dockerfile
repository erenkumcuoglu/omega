# Build stage
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy all source code and manifests
COPY . .

# Enable pnpm and install dependencies from workspace lockfile
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV CI=true
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd /app/apps/api && npx prisma generate

# Build shared package first
RUN pnpm --filter @omega/shared build

# Build the API
RUN pnpm --filter @omega/api build

# Production stage
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/apps/api /app/apps/api

# Create app user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m omega

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Generate Prisma client
RUN cd /app/apps/api && npx prisma generate

# Change ownership
RUN chown -R omega:nodejs /app

# Switch to non-root user
USER omega

WORKDIR /app/apps/api

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
