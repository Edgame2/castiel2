# Multi-stage build for workers-processing
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/workers-processing/package.json ./apps/workers-processing/
# Copy API package.json (needed for API dependencies like googleapis, argon2)
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

# Install dependencies with shamefully-hoist to create flatter node_modules structure
RUN pnpm install --no-frozen-lockfile --shamefully-hoist

# Copy source code
COPY . .

# Build
RUN pnpm build --filter=@castiel/workers-processing

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built files and dependencies (with shamefully-hoist, dependencies are in root node_modules)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/workers-processing/dist ./dist
COPY --from=builder /app/apps/workers-processing/package.json ./package.json
# Copy all packages (some have dist, some are source-only like api-core)
COPY --from=builder /app/packages ./packages
# Note: API source is no longer needed - all services have been extracted to api-core

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Install tsx for TypeScript execution (needed for api-core which is source-only)
RUN npm install -g tsx

# Start application (using tsx to handle TypeScript imports from api-core)
CMD ["tsx", "dist/index.js"]



