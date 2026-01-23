# 🛠️ Development Guide

> **Migration Status**: ✅ The platform has been migrated from Azure Functions to Azure Container Apps.  
> See [Migration Complete Summary](./migration/MIGRATION_COMPLETE_SUMMARY.md) for details.

> Getting started with Castiel development.

---

## 📋 Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >= 20.0.0 | Use nvm for version management |
| pnpm | >= 9.0.0 | Package manager |
| Azure Cosmos DB | - | NoSQL database |
| Redis | >= 7.0 | Local or Azure Redis |
| Git | >= 2.0 | Version control |

### Optional
- Azure CLI (for deployment)
- Docker (for containerized development)
- VS Code (recommended IDE)

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/castiel/castiel.git
cd castiel
```

### 2. Install Dependencies

```bash
# Install pnpm if needed
npm install -g pnpm

# Install all dependencies
pnpm install
```

### 3. Configure Environment

```bash
# Copy environment templates
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Edit the .env files with your credentials
```

### 4. Choose Your Setup

#### Option A: Hybrid Local-Azure Setup (Recommended)

Run containers locally while connecting to Azure services (Cosmos DB, Redis, Key Vault, etc.):

```bash
# Copy environment template
cp .env.example .env

# Fill in Azure service connection strings (see Hybrid Setup Guide)
# Then start containers
docker-compose up
```

**See**: [Hybrid Local-Azure Setup Guide](./development/HYBRID_LOCAL_AZURE_SETUP.md) for detailed instructions.

#### Option B: Fully Local Setup

If using Docker for local Redis:
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 5. Initialize Database

```bash
# Create Cosmos DB containers
pnpm db:init

# Seed initial data
pnpm db:seed
```

### 6. Start Development

```bash
# Start all services (API + Web)
pnpm dev

# Start all services including workers
pnpm dev:all

# Or start individually
pnpm dev:api              # Backend at http://localhost:3001
pnpm dev:web              # Frontend at http://localhost:3000
pnpm dev:workers          # All worker apps
pnpm dev:workers-sync     # Sync workers only
pnpm dev:workers-processing # Processing workers only
pnpm dev:workers-ingestion # Ingestion workers only
```

**Note:** Worker apps run on port `8080` by default. They don't expose HTTP endpoints for external access, but have health check endpoints at `/health`, `/readiness`, and `/liveness`.

---

## 🐳 Docker Compose Development

For containerized development with all services:

```bash
# Ensure .env file is configured (see Hybrid Setup Guide)
cp .env.example .env
# Edit .env with your Azure service connection strings

# Start all services in containers
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

**Services in Docker Compose:**
- `api` - Main API (port 3001)
- `web` - Web frontend (port 3000)
- `workers-sync` - Sync workers (port 8080)
- `workers-processing` - Processing workers (port 8080)
- `workers-ingestion` - Ingestion workers (port 8080)

**See:** [Hybrid Local-Azure Setup Guide](./development/HYBRID_LOCAL_AZURE_SETUP.md) for detailed configuration.

---

## 📁 Project Structure

```
castiel/
├── apps/                    # Application services
│   ├── api/                 # Fastify backend
│   ├── web/                 # Next.js frontend
│   ├── workers-sync/         # Sync workers (Container App)
│   ├── workers-processing/   # Processing workers (Container App)
│   └── workers-ingestion/    # Ingestion workers (Container App)
├── packages/                # Shared libraries
│   ├── queue/               # BullMQ queue definitions
│   ├── api-core/            # Core API utilities
│   └── monitoring/          # Monitoring utilities
├── infrastructure/
│   └── terraform/           # Infrastructure as Code
│   ├── shared-types/        # TypeScript types
│   ├── shared-utils/        # Utility functions
│   ├── redis-utils/         # Redis helpers
│   ├── monitoring/          # App Insights
│   ├── key-vault/           # Azure Key Vault
│   └── azure-ad-b2c/        # Azure AD B2C
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── terraform/               # Infrastructure
└── turbo.json               # Turborepo config
```

---

## 🔧 Available Scripts

### Development

```bash
pnpm dev          # Start all services
pnpm dev:api      # Start API only
pnpm dev:web      # Start web only
```

### Building

```bash
pnpm build        # Build all packages
pnpm build:api    # Build API only
pnpm build:web    # Build web only
```

### Testing

```bash
pnpm test         # Run all tests
pnpm test:watch   # Watch mode
pnpm test:e2e     # E2E tests (web)
```

### Quality

```bash
pnpm lint         # Lint all packages
pnpm lint:fix     # Fix lint issues
pnpm typecheck    # Type check all packages
```

### Database

```bash
pnpm db:init      # Initialize containers
pnpm db:seed      # Seed database
pnpm tenant:provision  # Provision tenant
```

### Maintenance

```bash
pnpm clean        # Remove build artifacts
```

---

## 🔐 Environment Variables

### API (`apps/api/.env`)

```bash
# Server
NODE_ENV=development
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=debug

# Database
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-primary-key
COSMOS_DATABASE=castiel

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=development-secret-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@localhost

# OAuth (optional for development)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

### Web (`apps/web/.env.local`)

```bash
# API
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Features
NEXT_PUBLIC_ENABLE_MFA=true
NEXT_PUBLIC_ENABLE_SSO=true
NEXT_PUBLIC_ENABLE_MAGIC_LINK=true
```

---

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests for specific package
pnpm test --filter=@castiel/api

# Watch mode
pnpm test:watch
```

### E2E Tests

```bash
# Ensure services are running first
pnpm dev

# In another terminal
pnpm test:e2e

# Interactive mode
pnpm test:e2e:ui
```

### Writing Tests

Tests are colocated with source files:

```
src/services/
├── auth.service.ts
└── auth.service.test.ts
```

---

## 🔄 Git Workflow

### Branch Naming

```
feature/TASK-123-add-mfa-support
bugfix/TASK-456-fix-login-redirect
hotfix/TASK-789-security-patch
```

### Commit Messages

Follow conventional commits:

```
feat: add MFA support for SMS
fix: correct login redirect URL
docs: update API documentation
chore: update dependencies
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes and commit
3. Run quality checks: `pnpm lint && pnpm typecheck && pnpm test`
4. Push and create PR
5. Wait for CI and code review
6. Merge to `main`

---

## 🐛 Debugging

### API Debugging (VS Code)

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev:api"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging

```typescript
// API logging
import { logger } from './config/logger';

logger.info('User logged in', { userId, method: 'email' });
logger.error('Login failed', { error, email });
```

### API Explorer

- Swagger UI: http://localhost:3001/api/docs
- GraphQL Playground: http://localhost:3001/graphql

---

## 📦 Adding Dependencies

```bash
# Add to specific package
pnpm add axios --filter=@castiel/api
pnpm add -D @types/node --filter=@castiel/api

# Add to root (dev tools)
pnpm add -D turbo -w

# Add to shared package
pnpm add zod --filter=@castiel/shared-types
```

---

## 🔗 Useful Links

- [Architecture](./ARCHITECTURE.md)
- [API Documentation](./backend/API.md)
- [Frontend Guide](./frontend/README.md)
- [Migration Guide](./MIGRATION_TURBOREPO.md)
- [Shards System](./shards/README.md)
- [Hybrid Local-Azure Setup](./development/HYBRID_LOCAL_AZURE_SETUP.md) - Run containers locally with Azure services

---

## 💬 Getting Help

- Check existing documentation in `/docs`
- Search GitHub issues
- Ask in team Slack channel
- Email: dev-support@castiel.com

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Development guide fully documented

#### Implemented Features (✅)

- ✅ Quick start guide
- ✅ Prerequisites documentation
- ✅ Environment configuration
- ✅ Docker Compose setup
- ✅ Project structure
- ✅ Available scripts
- ✅ Hybrid local-Azure setup

#### Known Limitations

- ⚠️ **Environment Variables** - Environment variables may be scattered
  - **Recommendation:**
    1. Centralize environment variable documentation
    2. Validate environment configuration
    3. Document all required variables

- ⚠️ **Setup Complexity** - Setup may be complex for new developers
  - **Recommendation:**
    1. Simplify setup process
    2. Add setup verification scripts
    3. Document troubleshooting steps

### Related Documentation

- [Gap Analysis](./GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Environment Variables](./development/ENVIRONMENT_VARIABLES.md) - Environment variable reference
- [Hybrid Setup](./development/HYBRID_LOCAL_AZURE_SETUP.md) - Hybrid setup guide









