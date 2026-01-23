# Castiel Development Scripts

This directory contains scripts for managing the Castiel application development environment.

## Quick Start (Recommended)

With Turborepo, starting development is simple:

```bash
# Start all services
pnpm dev

# Start API only
pnpm dev:api

# Start Web only
pnpm dev:web
```

## Available Scripts

### Turborepo Commands (Recommended)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services with Turborepo |
| `pnpm dev:api` | Start only API service |
| `pnpm dev:web` | Start only Web service |
| `pnpm build` | Build all services |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all services |
| `pnpm clean` | Clean build artifacts |

### Legacy Scripts

These scripts provide additional features like health checks and logging:

#### `start-dev.sh`
**Startup script with dependency checking and health monitoring**

Features:
- ✅ Pre-flight checks (Node.js, pnpm, Redis)
- ✅ Sequential startup with proper ordering
- ✅ Health checks with timeout protection
- ✅ Detailed logging to `/tmp/castiel/`
- ✅ Handles port conflicts automatically

Usage:
```bash
./scripts/start-dev.sh
```

#### `stop-dev.sh`
**Gracefully stops all services**

Usage:
```bash
./scripts/stop-dev.sh
```

#### `status.sh`
**Shows current status of all services**

Usage:
```bash
./scripts/status.sh
```

### Database Scripts

#### `provision-castiel-tenant.ts`
**Seeds the Castiel tenant and promotes the default admin user**

```bash
pnpm tenant:provision
```

#### `init-database.ts`
**Initialize Cosmos DB containers**

```bash
pnpm db:init
```

#### `seed-database.ts`
**Seed database with initial data**

```bash
pnpm db:seed
```

## Service Ports

| Service | Port |
|---------|------|
| API | 3001 |
| Web | 3000 |

## Log Files

When using `start-dev.sh`, logs are written to `/tmp/castiel/`:

```bash
# View logs in real-time
tail -f /tmp/castiel/api.log
tail -f /tmp/castiel/web.log

# View all logs together
tail -f /tmp/castiel/*.log
```

## Troubleshooting

### Services won't start

1. Check if ports are already in use:
   ```bash
   lsof -ti:3000,3001
   ```

2. Kill existing processes:
   ```bash
   lsof -ti:3000,3001 | xargs kill -9
   ```

3. Check logs:
   ```bash
   cat /tmp/castiel/*.log
   ```

### Redis not available

Services will run in degraded mode without Redis:
- Session storage falls back to memory
- Caching is disabled

To start Redis:
```bash
redis-server
# or with Docker
docker run -d -p 6379:6379 redis:7-alpine
```

## Development Workflow

### Recommended (Turborepo)

```bash
# Start everything
pnpm dev

# Watch both services restart on changes automatically
```

### With Legacy Scripts

```bash
# Start with health checks
./scripts/start-dev.sh

# In another terminal, watch logs
tail -f /tmp/castiel/*.log

# Stop when done
./scripts/stop-dev.sh
```

### Individual Services

```bash
# Start only API
cd apps/api && pnpm dev

# Start only Web
cd apps/web && pnpm dev
```

## Environment Requirements

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Redis (optional, but recommended)
- Azure Cosmos DB credentials (in .env files)

## Project Structure

```
castiel/
├── apps/
│   ├── api/          # Backend API (Fastify)
│   └── web/          # Frontend (Next.js)
├── packages/         # Shared libraries
├── scripts/          # Development scripts (this folder)
└── turbo.json        # Turborepo configuration
```

## Support

If you encounter issues:

1. Check logs: `tail -f /tmp/castiel/*.log`
2. Verify environment files exist in `apps/api/.env` and `apps/web/.env.local`
3. Ensure Redis is running (if using cache features)
4. Check Azure credentials are valid

For more information, see the main [README.md](../README.md).
