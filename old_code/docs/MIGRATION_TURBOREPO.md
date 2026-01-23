# 🚀 Migration to Turborepo Structure

> **Status**: Pending  
> **Priority**: High  
> **Estimated Time**: 2-3 hours

This document outlines the migration from the current `services/` structure to a modern `apps/` structure with Turborepo for improved developer experience and build performance.

---

## 📋 Migration Checklist

### Phase 1: Preparation
- [ ] Backup current state (commit all changes)
- [ ] Stop all running development services
- [ ] Document any custom configurations

### Phase 2: Install Turborepo
- [ ] Install turbo as dev dependency at root
- [ ] Create `turbo.json` configuration

### Phase 3: Restructure Folders
- [ ] Rename `services/` → `apps/`
- [ ] Rename `apps/main-api/` → `apps/api/`
- [ ] Rename `apps/frontend/` → `apps/web/`

### Phase 4: Update Package Configurations
- [ ] Update `pnpm-workspace.yaml`
- [ ] Update root `package.json`
- [ ] Update `apps/api/package.json` (name: `@castiel/api`)
- [ ] Update `apps/web/package.json` (name: `@castiel/web`)
- [ ] Update all workspace references in packages

### Phase 5: Update Imports & References
- [ ] Search and replace `@castiel/main-api` → `@castiel/api`
- [ ] Search and replace `@castiel/frontend` → `@castiel/web`
- [ ] Update any hardcoded paths in scripts
- [ ] Update CI/CD pipelines if any

### Phase 6: Clean & Reinstall
- [ ] Remove all `node_modules` directories
- [ ] Remove all `.turbo` directories
- [ ] Remove `pnpm-lock.yaml`
- [ ] Run `pnpm install`

### Phase 7: Verification
- [ ] Run `pnpm dev` - verify both services start
- [ ] Run `pnpm build` - verify build succeeds
- [ ] Run `pnpm test` - verify tests pass
- [ ] Run `pnpm lint` - verify linting works
- [ ] Test API endpoints manually
- [ ] Test frontend pages manually

### Phase 8: Cleanup
- [ ] Remove old `scripts/start-dev.sh` (replaced by turbo)
- [ ] Remove old `scripts/stop-dev.sh`
- [ ] Update documentation
- [ ] Delete this migration document (or mark as complete)

---

## 📁 Structure Changes

### Before
```
castiel/
├── services/
│   ├── main-api/          # @castiel/main-api
│   └── frontend/          # @castiel/frontend
├── packages/
└── scripts/
    ├── start-dev.sh       # Complex bash script
    └── stop-dev.sh
```

### After
```
castiel/
├── apps/
│   ├── api/               # @castiel/api
│   └── web/               # @castiel/web
├── packages/
├── turbo.json             # Turborepo config
└── scripts/               # Utility scripts only
```

---

## 📄 Configuration Files

### 1. `turbo.json` (create at root)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env", ".env.local"],
  "globalEnv": [
    "NODE_ENV",
    "COSMOS_*",
    "REDIS_*",
    "JWT_*",
    "AZURE_*",
    "NEXT_PUBLIC_*"
  ],
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "lint:fix": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 2. `pnpm-workspace.yaml` (update)

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 3. Root `package.json` (update)

```json
{
  "name": "@castiel/root",
  "version": "1.0.0",
  "private": true,
  "description": "Castiel - Enterprise B2B SaaS Platform",
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "dev": "turbo dev",
    "dev:api": "turbo dev --filter=@castiel/api",
    "dev:web": "turbo dev --filter=@castiel/web",
    "build": "turbo build",
    "build:api": "turbo build --filter=@castiel/api",
    "build:web": "turbo build --filter=@castiel/web",
    "start": "turbo start",
    "test": "turbo test",
    "test:watch": "turbo test:watch",
    "lint": "turbo lint",
    "lint:fix": "turbo lint:fix",
    "typecheck": "turbo typecheck",
    "clean": "turbo clean && rm -rf node_modules .turbo",
    "db:init": "tsx scripts/init-database.ts",
    "db:seed": "tsx scripts/seed-database.ts",
    "tenant:provision": "tsx scripts/provision-castiel-tenant.ts"
  },
  "devDependencies": {
    "@types/node": "^20.19.25",
    "dotenv": "^16.6.1",
    "tsx": "^4.20.6",
    "turbo": "^2.3.0",
    "typescript": "^5.3.3"
  },
  "dependencies": {
    "@azure/cosmos": "^4.7.0",
    "@azure/identity": "^4.13.0",
    "@azure/keyvault-secrets": "^4.10.0"
  }
}
```

### 4. `apps/api/package.json` (key changes)

```json
{
  "name": "@castiel/api",
  "scripts": {
    "dev": "tsx watch --clear-screen=false src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "clean": "rm -rf dist .turbo *.tsbuildinfo"
  }
}
```

### 5. `apps/web/package.json` (key changes)

```json
{
  "name": "@castiel/web",
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "clean": "rm -rf .next .turbo"
  }
}
```

### 6. `apps/web/next.config.ts` (add standalone output)

```typescript
const nextConfig = {
  output: 'standalone',  // Required for Docker
  // ... existing config
}
```

---

## 🛠️ Migration Commands

Execute these commands in order:

```bash
# 1. Ensure clean state
git status
git add -A && git commit -m "Pre-migration checkpoint"

# 2. Stop services
./scripts/stop-dev.sh 2>/dev/null || true
pkill -f "tsx watch" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# 3. Install Turborepo
pnpm add -D turbo -w

# 4. Rename folders
mv services apps
mv apps/main-api apps/api
mv apps/frontend apps/web

# 5. Create turbo.json (copy from above)

# 6. Update pnpm-workspace.yaml (copy from above)

# 7. Update package.json files manually
# - Root package.json
# - apps/api/package.json (change name to @castiel/api)
# - apps/web/package.json (change name to @castiel/web)

# 8. Clean and reinstall
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
rm -rf .turbo
rm -rf apps/*/.turbo
rm pnpm-lock.yaml
pnpm install

# 9. Test
pnpm dev
```

---

## ✅ Post-Migration Verification

### API Checks
- [ ] `http://localhost:3001/health` returns 200
- [ ] `http://localhost:3001/api/docs` shows Swagger UI
- [ ] Authentication endpoints work
- [ ] GraphQL playground accessible

### Web Checks
- [ ] `http://localhost:3000` loads the app
- [ ] Login flow works
- [ ] API calls from frontend succeed
- [ ] Hot reload works on file changes

### Build Checks
- [ ] `pnpm build` completes without errors
- [ ] `pnpm build:api` creates `apps/api/dist/`
- [ ] `pnpm build:web` creates `apps/web/.next/`

---

## 🐳 Docker Support (Production Only)

After migration, Docker files should be created in:

```
castiel/
├── apps/
│   ├── api/
│   │   └── Dockerfile
│   └── web/
│       └── Dockerfile
└── docker/
    ├── docker-compose.yml
    ├── docker-compose.prod.yml
    └── .dockerignore
```

See `docs/deployment/docker-setup.md` for Docker configuration details.

---

## 🔄 Rollback Plan

If migration fails:

```bash
# Reset to pre-migration state
git checkout .
git clean -fd

# Reinstall dependencies
pnpm install

# Restart with old scripts
./scripts/start-dev.sh
```

---

## 📚 References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Next.js Standalone Output](https://nextjs.org/docs/advanced-features/output-file-tracing)

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Migration to Turborepo complete

#### Implemented Features (✅)

- ✅ Turborepo structure
- ✅ Apps and packages organization
- ✅ Build pipeline
- ✅ Development scripts

#### Known Limitations

- ⚠️ **Migration Status** - Document shows "Pending" but migration appears complete
  - **Code Reference:**
    - Current structure uses `apps/` and `packages/`
  - **Recommendation:**
    1. Update migration status
    2. Mark migration as complete
    3. Archive migration document if no longer needed

### Related Documentation

- [Gap Analysis](./GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Development Guide](./DEVELOPMENT.md) - Development setup
- [Architecture](./ARCHITECTURE.md) - System architecture











