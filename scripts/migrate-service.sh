#!/bin/bash
# Service Migration Script
# Automates the creation of module structure for migrating services from old_code/ to containers/

set -e

SERVICE_NAME=$1
OLD_CODE_PATH="old_code/apps/api/src"
NEW_CONTAINER_PATH="containers"

if [ -z "$SERVICE_NAME" ]; then
  echo "Usage: ./scripts/migrate-service.sh <service-name>"
  echo "Example: ./scripts/migrate-service.sh enrichment"
  exit 1
fi

# Normalize service name (kebab-case)
SERVICE_NAME=$(echo "$SERVICE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/_/-/g')

echo "🚀 Migrating service: $SERVICE_NAME"
echo ""

# Check if service already exists
if [ -d "$NEW_CONTAINER_PATH/$SERVICE_NAME" ]; then
  echo "⚠️  Service already exists at $NEW_CONTAINER_PATH/$SERVICE_NAME"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p "$NEW_CONTAINER_PATH/$SERVICE_NAME"/{config,src/{config,routes,services,types,utils,events/{publishers,consumers},middleware,jobs},tests/{unit,integration,fixtures},docs}

# Create required files
echo "📝 Creating required files..."

# package.json
cat > "$NEW_CONTAINER_PATH/$SERVICE_NAME/package.json" <<EOF
{
  "name": "@coder/$SERVICE_NAME",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "lint": "eslint src",
    "lint:fix": "eslint src --fix",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@coder/shared": "workspace:*",
    "fastify": "^4.24.0",
    "@fastify/swagger": "^8.12.0",
    "@fastify/swagger-ui": "^1.9.3",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "eslint": "^8.56.0",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "vitest": "^1.2.0"
  }
}
EOF

# tsconfig.json
cat > "$NEW_CONTAINER_PATH/$SERVICE_NAME/tsconfig.json" <<EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF

# Dockerfile
cat > "$NEW_CONTAINER_PATH/$SERVICE_NAME/Dockerfile" <<EOF
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3XXX
CMD ["node", "dist/server.js"]
EOF

# .gitignore
cat > "$NEW_CONTAINER_PATH/$SERVICE_NAME/.gitignore" <<EOF
node_modules/
dist/
*.log
.env
.env.local
config/local.yaml
.DS_Store
coverage/
.nyc_output/
EOF

# config/default.yaml template
cat > "$NEW_CONTAINER_PATH/$SERVICE_NAME/config/default.yaml" <<EOF
# $SERVICE_NAME Module Configuration
# Per ModuleImplementationGuide Section 4

module:
  name: $SERVICE_NAME
  version: 1.0.0

server:
  port: \${PORT:-3XXX}
  host: \${HOST:-0.0.0.0}

# Cosmos DB Configuration (shared database, prefixed containers)
cosmos_db:
  endpoint: \${COSMOS_DB_ENDPOINT}
  key: \${COSMOS_DB_KEY}
  database_id: \${COSMOS_DB_DATABASE_ID:-castiel}
  containers:
    main: ${SERVICE_NAME}_data

# JWT Configuration (shared with auth service)
jwt:
  secret: \${JWT_SECRET}

# External Service URLs (from config, not hardcoded)
services:
  auth:
    url: \${AUTH_URL:-http://localhost:3021}
  logging:
    url: \${LOGGING_URL:-http://localhost:3014}
  user_management:
    url: \${USER_MANAGEMENT_URL:-http://localhost:3022}

# RabbitMQ Configuration
rabbitmq:
  url: \${RABBITMQ_URL}
  exchange: coder_events
  queue: ${SERVICE_NAME}_service
  bindings: []

# Feature Flags
features: {}
EOF

# config/schema.json template
cat > "$NEW_CONTAINER_PATH/$SERVICE_NAME/config/schema.json" <<EOF
{
  "\$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["server", "cosmos_db"],
  "properties": {
    "module": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "version": { "type": "string" }
      }
    },
    "server": {
      "type": "object",
      "required": ["port"],
      "properties": {
        "port": { "type": "number" },
        "host": { "type": "string" }
      }
    },
    "cosmos_db": {
      "type": "object",
      "required": ["endpoint", "key", "database_id"],
      "properties": {
        "endpoint": { "type": "string" },
        "key": { "type": "string" },
        "database_id": { "type": "string" },
        "containers": {
          "type": "object",
          "properties": {
            "main": { "type": "string" }
          }
        }
      }
    },
    "jwt": {
      "type": "object",
      "required": ["secret"],
      "properties": {
        "secret": { "type": "string" }
      }
    },
    "services": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "url": { "type": "string" }
        }
      }
    },
    "rabbitmq": {
      "type": "object",
      "properties": {
        "url": { "type": "string" },
        "exchange": { "type": "string" },
        "queue": { "type": "string" }
      }
    }
  }
}
EOF

# src/config/index.ts
cat > "$NEW_CONTAINER_PATH/$SERVICE_NAME/src/config/index.ts" <<EOF
/**
 * Configuration loader for $SERVICE_NAME module
 * Per ModuleImplementationGuide Section 4.4
 */

import { load } from 'js-yaml';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import Ajv from 'ajv';
import schema from '../../config/schema.json';

export interface ModuleConfig {
  module: {
    name: string;
    version: string;
  };
  server: {
    port: number;
    host: string;
  };
  cosmos_db: {
    endpoint: string;
    key: string;
    database_id: string;
    containers: {
      main: string;
      [key: string]: string;
    };
  };
  jwt: {
    secret: string;
  };
  services: {
    [key: string]: {
      url: string;
    };
  };
  rabbitmq: {
    url: string;
    exchange: string;
    queue: string;
    bindings: string[];
  };
  features: {
    [key: string]: boolean;
  };
}

function resolveEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const defaultValue = varName.includes(':') ? varName.split(':')[1] : undefined;
      const envVar = varName.split(':')[0];
      return process.env[envVar] || defaultValue || match;
    });
  }
  if (Array.isArray(obj)) {
    return obj.map(resolveEnvVars);
  }
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, resolveEnvVars(value)])
    );
  }
  return obj;
}

export function loadConfig(): ModuleConfig {
  const env = process.env.NODE_ENV || 'development';
  const configPath = resolve(process.cwd(), 'config', 'default.yaml');
  
  // Load default config
  const defaultConfig = load(readFileSync(configPath, 'utf8')) as ModuleConfig;
  
  // Load environment-specific overrides if they exist
  let envConfig = {};
  try {
    const envConfigPath = resolve(process.cwd(), 'config', \`\${env}.yaml\`);
    envConfig = load(readFileSync(envConfigPath, 'utf8')) as Partial<ModuleConfig>;
  } catch {
    // No env-specific config
  }
  
  // Merge configs
  const merged = { ...defaultConfig, ...envConfig };
  
  // Resolve environment variables
  const resolved = resolveEnvVars(merged) as ModuleConfig;
  
  // Validate against schema
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  if (!validate(resolved)) {
    throw new Error(\`Invalid config: \${JSON.stringify(validate.errors)}\`);
  }
  
  return resolved;
}
EOF

# src/utils/logger.ts
cat > "$NEW_CONTAINER_PATH/$SERVICE_NAME/src/utils/logger.ts" <<EOF
/**
 * Structured logger for $SERVICE_NAME module
 */

export const log = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      service: '$SERVICE_NAME',
      timestamp: new Date().toISOString(),
      ...context,
    }));
  },
  error: (message: string, error?: Error | any, context?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      service: '$SERVICE_NAME',
      timestamp: new Date().toISOString(),
      error: error?.message || error,
      stack: error?.stack,
      ...context,
    }));
  },
  warn: (message: string, context?: Record<string, any>) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      service: '$SERVICE_NAME',
      timestamp: new Date().toISOString(),
      ...context,
    }));
  },
  debug: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({
        level: 'debug',
        message,
        service: '$SERVICE_NAME',
        timestamp: new Date().toISOString(),
        ...context,
      }));
    }
  },
};
EOF

# README.md template
cat > "$NEW_CONTAINER_PATH/$SERVICE_NAME/README.md" <<EOF
# ${SERVICE_NAME^} Module

[Description of what this service does]

## Features

- Feature 1
- Feature 2

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+ (for event publishing)

### Installation

\`\`\`bash
npm install
\`\`\`

### Configuration

\`\`\`bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
\`\`\`

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers). Ensure the following containers exist:

- \`${SERVICE_NAME}_data\` - Main data container

### Running

\`\`\`bash
# Development
npm run dev

# Production
npm run build
npm start
\`\`\`

## API Reference

See [OpenAPI Spec](./openapi.yaml)

## Events

### Published Events

- \`${SERVICE_NAME}.event.name\`

### Consumed Events

- \`other.event.name\`

## Development

### Running Tests

\`\`\`bash
npm test
\`\`\`

## License

Proprietary
EOF

# CHANGELOG.md
cat > "$NEW_CONTAINER_PATH/$SERVICE_NAME/CHANGELOG.md" <<EOF
# Changelog

All notable changes to this module will be documented in this file.

## [1.0.0] - $(date +%Y-%m-%d)

### Added
- Initial migration from old_code/
- Core functionality
EOF

echo ""
echo "✅ Module structure created at $NEW_CONTAINER_PATH/$SERVICE_NAME"
echo ""
echo "📋 Next steps:"
echo "1. Find source files in $OLD_CODE_PATH/services"
echo "2. Copy and transform service files to src/services/"
echo "3. Copy and transform route files to src/routes/"
echo "4. Update config/default.yaml with service-specific settings"
echo "5. Create src/server.ts (see SERVICE_MIGRATION_GUIDE.md)"
echo "6. Create openapi.yaml"
echo "7. Write tests"
echo ""
echo "📖 See SERVICE_MIGRATION_GUIDE.md for detailed migration instructions"
