# Build Verification Guide

## Overview

This guide helps verify that all services and packages build correctly in the Castiel monorepo.

## Build Order

Turborepo automatically handles build dependencies using the `^build` dependency in `turbo.json`. This ensures packages are built before apps that depend on them.

### Build Dependency Graph

```
packages/shared-types
  └── packages/monitoring
  └── packages/key-vault
  └── packages/queue
  └── packages/api-core
      └── apps/api
      └── apps/workers-sync
      └── apps/workers-processing
      └── apps/workers-ingestion
  └── apps/web
```

## Quick Build Verification

### Build All Services

```bash
# Build everything (packages + apps)
pnpm build

# This will:
# 1. Build all packages first (shared-types, monitoring, queue, etc.)
# 2. Then build all apps (api, web, workers-*)
```

### Build Specific Services

```bash
# Build packages only
pnpm build --filter=./packages/*

# Build worker apps only
pnpm build:workers

# Build individual services
pnpm build:api
pnpm build:web
pnpm build:workers-sync
pnpm build:workers-processing
pnpm build:workers-ingestion
```

## Type Checking

### Check All Services

```bash
# Type check everything
pnpm typecheck

# Type check specific service
pnpm --filter @castiel/workers-sync typecheck
pnpm --filter @castiel/workers-processing typecheck
pnpm --filter @castiel/workers-ingestion typecheck
```

## Build Verification Checklist

### 1. Verify Package Builds

```bash
# Check if packages have dist folders
ls -la packages/*/dist

# Expected output should show dist folders for:
# - packages/queue/dist
# - packages/monitoring/dist
# - packages/key-vault/dist
# - packages/shared-types/dist
# - packages/api-core/dist (if it has build script)
```

### 2. Verify Worker App Builds

```bash
# Build worker apps
pnpm build:workers

# Check dist folders
ls -la apps/workers-*/dist

# Expected:
# - apps/workers-sync/dist
# - apps/workers-processing/dist
# - apps/workers-ingestion/dist
```

### 3. Verify TypeScript Compilation

```bash
# Run type checking
pnpm typecheck

# Should complete without errors
```

### 4. Verify Docker Builds

```bash
# Test Docker builds locally
docker-compose build

# Or build individual services
docker build -f apps/api/Dockerfile -t castiel-api:test .
docker build -f apps/workers-sync/Dockerfile -t castiel-workers-sync:test .
docker build -f apps/workers-processing/Dockerfile -t castiel-workers-processing:test .
docker build -f apps/workers-ingestion/Dockerfile -t castiel-workers-ingestion:test .
```

## Common Build Issues

### Issue: Package Not Found

**Error**: `Cannot find module '@castiel/queue'`

**Solution**:
```bash
# Ensure packages are built first
pnpm build --filter=./packages/*

# Or build everything
pnpm build
```

### Issue: TypeScript Errors

**Error**: Type errors in worker apps

**Solution**:
```bash
# Check for type errors
pnpm typecheck

# Fix errors or check tsconfig.json extends correctly
```

### Issue: Missing Dependencies

**Error**: `Cannot find module 'bullmq'`

**Solution**:
```bash
# Reinstall dependencies
pnpm install

# Verify package.json has correct dependencies
```

### Issue: Build Order Problems

**Error**: Package not built when app tries to use it

**Solution**:
- Turborepo should handle this automatically with `dependsOn: ["^build"]`
- If issues persist, manually build packages first:
  ```bash
  pnpm build --filter=./packages/*
  pnpm build --filter=./apps/*
  ```

## Development vs Production Builds

### Development Mode

In development, worker apps use `tsx watch` which can work directly with TypeScript source files:

```bash
pnpm dev:workers
# Uses: tsx watch src/index.ts
# No build step required
```

### Production Mode

For production, services must be built:

```bash
# Build first
pnpm build

# Then start
pnpm start:workers
# Uses: node dist/index.js
# Requires dist/ folder
```

## Docker Build Process

Docker builds follow this process:

1. **Copy package files** - `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
2. **Copy package.json files** - For all packages and the target app
3. **Install dependencies** - `pnpm install --frozen-lockfile`
4. **Copy source code** - All source files
5. **Build** - `pnpm build --filter=@castiel/<app-name>`
   - This automatically builds dependencies first (via Turbo)
6. **Copy built files** - `dist/` folders to production image

## Verification Script

Create a simple verification script:

```bash
#!/bin/bash
# scripts/verify-build.sh

echo "=== Build Verification ==="
echo ""

echo "1. Building packages..."
pnpm build --filter=./packages/* || exit 1

echo ""
echo "2. Building worker apps..."
pnpm build:workers || exit 1

echo ""
echo "3. Type checking..."
pnpm typecheck || exit 1

echo ""
echo "✅ All builds successful!"
```

## CI/CD Build Verification

The CI/CD pipeline automatically verifies builds:

1. **Pull Request**: Runs `pnpm build` and `pnpm typecheck`
2. **Docker Build**: Builds images in GitHub Actions
3. **Deployment**: Uses built images from Container Registry

## Troubleshooting

### Clean Build

If builds are failing, try a clean build:

```bash
# Clean all build artifacts
pnpm clean

# Reinstall dependencies
pnpm install

# Rebuild
pnpm build
```

### Check Build Output

```bash
# Check if dist folders exist
find . -name "dist" -type d | grep -E "(apps|packages)"

# Check build logs
pnpm build 2>&1 | tee build.log
```

### Verify Package Exports

```bash
# Check if packages export correctly
node -e "console.log(require('./packages/queue/dist/index.js'))"
```

## Related Documentation

- [Development Guide](./DEVELOPMENT.md)
- [Environment Variables](./ENVIRONMENT_VARIABLES.md)
- [CI/CD Deployment Guide](../ci-cd/CONTAINER_APPS_DEPLOYMENT.md)

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Build verification guide fully documented

#### Implemented Features (✅)

- ✅ Build order documentation
- ✅ Build verification checklist
- ✅ Type checking procedures
- ✅ Common build issues
- ✅ Docker build verification

#### Known Limitations

- ⚠️ **Build Automation** - Build verification may not be fully automated
  - **Recommendation:**
    1. Add automated build verification
    2. Integrate into CI/CD pipeline
    3. Document verification procedures

- ⚠️ **Build Performance** - Build times may be slow
  - **Recommendation:**
    1. Optimize build performance
    2. Use build caching
    3. Document performance tuning

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Development Guide](./DEVELOPMENT.md) - Development setup
- [CI/CD Deployment Guide](../ci-cd/CONTAINER_APPS_DEPLOYMENT.md) - CI/CD procedures



