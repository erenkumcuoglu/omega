# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build shared package
RUN npm run build:shared

# Build the API
RUN npm run build

# Production stage
FROM node:20-alpine

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S omega -u 1001

WORKDIR /app

# Copy built app and node_modules
COPY --from=builder --chown=omega:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=omega:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=omega:nodejs /app/apps/api/package*.json ./

# Switch to non-root user
USER omega

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node dist/health-check.js || exit 1

# Start the application
CMD ["node", "dist/index.js"]
