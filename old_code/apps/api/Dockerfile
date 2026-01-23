# Multi-stage build for API
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
# Copy all package.json files from packages (needed for workspace dependencies)
COPY packages/api-core/package.json ./packages/api-core/
COPY packages/key-vault/package.json ./packages/key-vault/
COPY packages/monitoring/package.json ./packages/monitoring/
COPY packages/queue/package.json ./packages/queue/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/azure-ad-b2c/package.json ./packages/azure-ad-b2c/
COPY packages/redis-utils/package.json ./packages/redis-utils/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies with shamefully-hoist to ensure all dependencies are available
RUN pnpm install --no-frozen-lockfile --shamefully-hoist

# Copy source code
COPY . .

# Build
RUN pnpm build --filter=@castiel/api

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built files and dependencies
# Copy all node_modules (with shamefully-hoist, dependencies are in root)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/packages ./packages

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]



