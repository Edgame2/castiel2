# Additional Quality & Development Recommendations

## 🚀 High Priority Recommendations

### 1. Pre-commit Hooks (Husky + lint-staged)

**Why**: Catch issues before they reach the repository

**Setup**:
```bash
npm install --save-dev husky lint-staged
npx husky init
```

**Configuration** (`package.json`):
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,yaml,md}": [
      "prettier --write"
    ]
  },
  "scripts": {
    "prepare": "husky install"
  }
}
```

**Hook** (`.husky/pre-commit`):
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
npm run type-check:all
```

### 2. CI/CD Pipeline (GitHub Actions)

**Why**: Automated quality checks on every PR and push

**Create**: `.github/workflows/quality.yml`

```yaml
name: Quality Checks

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        container: [shared, auth, logging, notification-manager]
    
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Type check
        run: |
          cd containers/${{ matrix.container }}
          pnpm run type-check || npm run type-check
      
      - name: Lint
        run: |
          cd containers/${{ matrix.container }}
          pnpm run lint || npm run lint
      
      - name: Test
        run: |
          cd containers/${{ matrix.container }}
          pnpm test || npm test
      
      - name: Coverage
        run: |
          cd containers/${{ matrix.container }}
          pnpm run test:coverage || npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./containers/${{ matrix.container }}/coverage/coverage-final.json
```

### 3. Dependency Management

**Why**: Keep dependencies secure and up-to-date

**Option A: Dependabot** (`.github/dependabot.yml`):
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "your-team"
    labels:
      - "dependencies"
  
  - package-ecosystem: "npm"
    directory: "/containers/shared"
    schedule:
      interval: "weekly"
```

**Option B: Renovate** (`.github/renovate.json`):
```json
{
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    },
    {
      "matchDepTypes": ["devDependencies"],
      "automerge": true
    }
  ]
}
```

### 4. Environment Variable Templates

**Why**: Document required environment variables

**Create**: `.env.example` at root:
```bash
# Cosmos DB
COSMOS_DB_ENDPOINT=
COSMOS_DB_KEY=
COSMOS_DB_DATABASE_ID=castiel

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# JWT
JWT_SECRET=
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# Service URLs (for inter-service communication)
AUTH_SERVICE_URL=http://localhost:3021
USER_MANAGEMENT_URL=http://localhost:3022
LOGGING_URL=http://localhost:3014
NOTIFICATION_MANAGER_URL=http://localhost:3001

# Service Authentication
SERVICE_AUTH_TOKEN=

# OAuth (if applicable)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

**Create**: `.env.template` per container (e.g., `containers/auth/.env.template`)

### 5. Docker Compose for Development

**Why**: Easy local development environment

**Create**: `docker-compose.dev.yml`:
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
  
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
  
  # Add Cosmos DB emulator if needed
  # cosmosdb-emulator:
  #   image: mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator
  #   ports:
  #     - "8081:8081"
  #     - "10250-10255:10250-10255"

volumes:
  redis-data:
  rabbitmq-data:
```

### 6. Root .gitignore

**Why**: Prevent committing build artifacts, dependencies, secrets

**Create**: `.gitignore`:
```
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
*.tsbuildinfo

# Testing
coverage/
.nyc_output/
*.log

# Environment
.env
.env.local
.env.*.local
*.pem
*.key

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Temporary
tmp/
temp/
*.tmp

# OS
Thumbs.db
```

### 7. Security Scanning

**Why**: Detect vulnerabilities early

**Add to CI/CD**:
```yaml
- name: Security audit
  run: |
    npm audit --audit-level=moderate
    # or use Snyk
    # npx snyk test
```

**Or use Snyk** (`.github/workflows/security.yml`):
```yaml
name: Security Scan

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  push:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

### 8. API Documentation Generation

**Why**: Keep API docs in sync with code

**Add to each container** (`package.json`):
```json
{
  "scripts": {
    "docs:generate": "typedoc --out docs/api src",
    "docs:serve": "serve docs/api"
  },
  "devDependencies": {
    "typedoc": "^0.25.0"
  }
}
```

**TypeDoc config** (`typedoc.json`):
```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "exclude": ["**/*.test.ts", "**/tests/**"],
  "theme": "default",
  "includeVersion": true
}
```

### 9. Changelog Automation

**Why**: Consistent changelog generation

**Use**: `standard-version` or `semantic-release`

**Setup** (`package.json`):
```json
{
  "scripts": {
    "release": "standard-version",
    "release:minor": "standard-version --release-as minor",
    "release:major": "standard-version --release-as major"
  },
  "devDependencies": {
    "standard-version": "^9.5.0"
  }
}
```

**Conventional Commits**: Use format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

### 10. Performance Monitoring

**Why**: Track performance regressions

**Add to CI/CD**:
```yaml
- name: Performance test
  run: |
    npm run build
    npm start &
    sleep 5
    # Run performance tests
    npm run test:perf
```

**Create**: `scripts/performance-baseline.sh`:
```bash
#!/bin/bash
# Performance baseline tests

# JWT validation < 50ms
# Login < 200ms
# Database query < 100ms
# etc.
```

## 📊 Medium Priority Recommendations

### 11. Code Coverage Badges

**Why**: Visual representation of test coverage

**Add to README.md**:
```markdown
![Coverage](https://codecov.io/gh/your-org/castiel/branch/main/graph/badge.svg)
```

### 12. Development Scripts

**Why**: Standardize common tasks

**Create**: `scripts/dev-setup.sh`:
```bash
#!/bin/bash
# Setup development environment

echo "Installing dependencies..."
npm install

echo "Building shared package..."
cd containers/shared && npm install && npm run build && cd ../..

echo "Starting infrastructure..."
docker-compose -f docker-compose.dev.yml up -d

echo "Waiting for services..."
sleep 10

echo "Development environment ready!"
```

### 13. Migration Helper Scripts

**Why**: Automate common migration tasks

**Create**: `scripts/create-module.sh`:
```bash
#!/bin/bash
# Create new module from template

MODULE_NAME=$1
if [ -z "$MODULE_NAME" ]; then
  echo "Usage: ./scripts/create-module.sh <module-name>"
  exit 1
fi

# Copy template
cp -r containers/auth "containers/$MODULE_NAME"

# Update placeholders
# ... (sed replacements)
```

### 14. Health Check Endpoints

**Why**: Monitor service health

**Standardize** in all containers:
```typescript
// GET /health
{
  "status": "healthy",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "rabbitmq": "healthy"
  }
}
```

### 15. Structured Logging Standards

**Why**: Consistent logging across services

**Create**: `containers/shared/src/utils/logger.ts`:
```typescript
export interface LogContext {
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export function createLogger(service: string) {
  return {
    info: (message: string, context?: LogContext) => { /* ... */ },
    error: (message: string, error?: Error, context?: LogContext) => { /* ... */ },
    // ...
  };
}
```

## 🔧 Low Priority (Nice to Have)

### 16. Visual Regression Testing

**Why**: Catch UI changes (if applicable)

**Tools**: Playwright, Percy, Chromatic

### 17. Load Testing

**Why**: Verify performance under load

**Tools**: k6, Artillery, Locust

### 18. Database Migration Tools

**Why**: Version control database schema

**Consider**: Prisma Migrate, TypeORM migrations

### 19. API Contract Testing

**Why**: Ensure API compatibility

**Tools**: Pact, OpenAPI diff

### 20. Documentation Site

**Why**: Centralized documentation

**Tools**: Docusaurus, VitePress, MkDocs

## 🎯 Implementation Priority

1. **Week 1**: Pre-commit hooks, CI/CD pipeline, .gitignore, .env.example
2. **Week 2**: Docker Compose, dependency management, security scanning
3. **Week 3**: Documentation generation, changelog automation
4. **Week 4**: Performance monitoring, health checks, logging standards

## 📝 Quick Start Commands

```bash
# Install pre-commit hooks
npm install --save-dev husky lint-staged
npx husky install

# Setup CI/CD
mkdir -p .github/workflows
# Copy quality.yml template

# Setup Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Run all quality checks
npm run lint:all
npm run type-check:all
npm run test:all
npm run format:check
```

---

**Note**: Prioritize based on your team's needs and timeline. Start with high-priority items for immediate impact.

