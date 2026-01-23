# Developer Onboarding Guide

**Last Updated:** 2025-01-XX  
**Target:** < 1 hour to productive contribution

---

## Overview

This guide will help you get up and running with the Castiel codebase quickly. Follow these steps to set up your development environment and make your first contribution.

---

## Prerequisites

### Required Software

- **Node.js:** >= 20.0.0 ([Download](https://nodejs.org/))
- **pnpm:** >= 9.0.0 ([Install](https://pnpm.io/installation))
- **Git:** Latest version
- **Docker & Docker Compose:** For local services (optional)

### Recommended Tools

- **VS Code:** With TypeScript, ESLint, Prettier extensions
- **Azure CLI:** For Azure service access (if using hybrid setup)
- **Redis CLI:** For Redis debugging

---

## Quick Start (5 minutes)

### 1. Clone Repository

```bash
git clone <repository-url>
cd castiel
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
# Copy example environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Edit with your values
nano apps/api/.env
nano apps/web/.env.local
```

**Minimum Required Variables:**
- `COSMOS_DB_ENDPOINT`
- `COSMOS_DB_KEY`
- `REDIS_URL` or `REDIS_HOST`
- `JWT_ACCESS_SECRET` (min 32 characters)
- `JWT_REFRESH_SECRET` (min 32 characters)

### 4. Start Services

```bash
# Start all services
pnpm dev

# Or start individually
pnpm dev:api    # API on http://localhost:3001
pnpm dev:web    # Web on http://localhost:3000
```

### 5. Verify Setup

```bash
# Check API health
curl http://localhost:3001/health

# Check web app
open http://localhost:3000
```

**✅ You're ready to code!**

---

## Detailed Setup

### Development Modes

#### Option 1: Fully Local (Docker Compose)

All services run locally:

```bash
# Start Redis
docker-compose up -d redis

# Start API and Web
pnpm dev
```

#### Option 2: Hybrid (Local + Azure)

Containers run locally, connect to Azure services:

```bash
# Set Azure service URLs in .env
COSMOS_DB_ENDPOINT=https://your-account.documents.azure.com:443/
REDIS_URL=rediss://your-redis.redis.cache.windows.net:6380

# Start services
pnpm dev
```

See [Hybrid Setup Guide](./development/HYBRID_LOCAL_AZURE_SETUP.md) for details.

---

## Project Structure

```
castiel/
├── apps/
│   ├── api/          # Backend API (Fastify)
│   ├── web/          # Frontend (Next.js)
│   └── workers-*/    # Background workers
├── packages/         # Shared libraries
├── docs/            # Documentation
├── scripts/         # Utility scripts
└── tests/           # Test suites
```

### Key Directories

- **`apps/api/src/`:** API source code
  - `controllers/`: Request handlers
  - `services/`: Business logic
  - `repositories/`: Data access
  - `routes/`: Route definitions
  - `middleware/`: Request middleware

- **`apps/web/src/`:** Frontend source code
  - `app/`: Next.js app router pages
  - `components/`: React components
  - `lib/`: Utilities and API client
  - `contexts/`: React contexts

- **`packages/`:** Shared packages
  - `@castiel/monitoring`: Monitoring abstraction
  - `@castiel/key-vault`: Azure Key Vault client
  - `@castiel/shared-types`: Shared TypeScript types

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/my-feature
```

### 2. Make Changes

- Follow coding standards (ESLint, Prettier)
- Write tests for new features
- Update documentation

### 3. Test Locally

```bash
# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
```

**Commit Convention:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

### 5. Push and Create PR

```bash
git push origin feature/my-feature
# Create PR on GitHub
```

---

## Common Tasks

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# Specific package
pnpm --filter @castiel/api test
```

### Database Operations

```bash
# Initialize database
pnpm db:init

# Seed test data
pnpm db:seed

# Reset database
pnpm db:reset
```

### Building

```bash
# Build all
pnpm build

# Build specific package
pnpm build:api
pnpm build:web
```

### Code Quality

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

---

## First Contribution

### Good First Issues

1. **Documentation:** Fix typos, improve docs
2. **Tests:** Add missing test coverage
3. **Bug Fixes:** Fix small bugs
4. **Refactoring:** Improve code quality

### Making Your First Change

1. **Pick an Issue:**
   - Look for "good first issue" labels
   - Start with documentation or tests

2. **Understand the Code:**
   - Read relevant files
   - Check existing tests
   - Review similar implementations

3. **Make the Change:**
   - Follow existing patterns
   - Write tests
   - Update documentation

4. **Submit PR:**
   - Clear description
   - Reference issue
   - Request review

---

## Troubleshooting

### Service Won't Start

**Check:**
- Environment variables set correctly
- Ports not in use (`lsof -ti:3000,3001`)
- Dependencies installed (`pnpm install`)

**Fix:**
```bash
# Check logs
docker logs <container-name>
tail -f /tmp/castiel/*.log
```

### Database Connection Fails

**Check:**
- Cosmos DB endpoint and key correct
- Network connectivity
- Firewall rules

**Fix:**
```bash
# Test connection
curl https://<endpoint>/_explorer
```

### Tests Failing

**Check:**
- Test environment configured
- Dependencies installed
- Test data seeded

**Fix:**
```bash
# Reinstall dependencies
pnpm install

# Reset test database
pnpm db:reset
```

See [Troubleshooting Runbook](./runbooks/troubleshooting.md) for more.

---

## Learning Resources

### Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [API Documentation](./api/README.md)
- [Development Guide](./development/DEVELOPMENT.md)
- [Testing Guide](../TESTING_GUIDE.md)

### Code Examples

- **API Routes:** `apps/api/src/routes/`
- **Services:** `apps/api/src/services/`
- **Components:** `apps/web/src/components/`
- **Tests:** `apps/api/tests/`, `apps/web/src/**/*.test.tsx`

---

## Getting Help

### Internal Resources

- **Slack/Teams:** #dev-help channel
- **Documentation:** Check `docs/` folder
- **Code Comments:** Read inline documentation

### External Resources

- **Fastify Docs:** https://www.fastify.io/
- **Next.js Docs:** https://nextjs.org/docs
- **TypeScript Docs:** https://www.typescriptlang.org/docs/

---

## Next Steps

1. ✅ Complete setup (this guide)
2. 📖 Read [Architecture Overview](./ARCHITECTURE.md)
3. 🔍 Explore codebase
4. 🐛 Fix a bug or add a test
5. 🚀 Make your first PR!

---

## Checklist

- [ ] Node.js and pnpm installed
- [ ] Repository cloned
- [ ] Dependencies installed (`pnpm install`)
- [ ] Environment variables configured
- [ ] Services start successfully (`pnpm dev`)
- [ ] Health checks pass
- [ ] Tests run successfully
- [ ] First code change made
- [ ] Ready to contribute!

---

**Welcome to the Castiel team! 🎉**
