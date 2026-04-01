# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all source code and manifests
COPY . .

# Enable pnpm and install dependencies from workspace lockfile
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV CI=true
RUN pnpm install --frozen-lockfile

# Generate Prisma client (if needed by shared package)
RUN cd /app/apps/api && npx prisma generate || true

# Build shared package
RUN pnpm --filter @omega/shared build

# Build the CMS
RUN pnpm --filter @omega/cms build

# Production stage
FROM nginx:alpine

# Copy built app
COPY --from=builder /app/apps/cms/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/cms/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
