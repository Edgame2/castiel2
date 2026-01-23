# Environment Management Module

**Category:** Project Management  
**Location:** `src/core/environments/`  
**Last Updated:** 2025-01-27

---

## Overview

The Environment Management Module provides multi-environment configuration and validation for the Coder IDE. It manages development, test, staging, and production environments with configuration validation and environment-specific settings.

## Purpose

- Multi-environment configuration
- Environment validation
- Environment switching
- Configuration management
- Environment deployment
- Environment parity checking

---

## Key Components

### 1. Environment Manager (`EnvironmentManager.ts`)

**Location:** `src/core/environments/EnvironmentManager.ts`

**Purpose:** Environment CRUD operations

**Key Methods:**
```typescript
async createEnvironment(projectId: string, name: 'dev' | 'test' | 'staging' | 'production', config?: EnvironmentConfig): Promise<Environment>
async getEnvironment(environmentId: string): Promise<Environment | null>
async listEnvironments(projectId: string): Promise<Environment[]>
async updateEnvironment(environmentId: string, config: EnvironmentConfig): Promise<Environment>
async deleteEnvironment(environmentId: string): Promise<void>
```

### 2. Environment Validator (`EnvironmentValidator.ts`)

**Location:** `src/core/environments/EnvironmentValidator.ts`

**Purpose:** Validate environment configurations

**Features:**
- Configuration validation
- Required fields checking
- Type validation
- Value validation
- Dependency validation

**Key Methods:**
```typescript
async validateEnvironment(environment: Environment): Promise<ValidationResult>
async validateConfig(config: EnvironmentConfig): Promise<ValidationResult>
```

---

## Environment Model

### Environment Structure

```typescript
interface Environment {
  id: string;
  projectId: string;
  name: 'dev' | 'test' | 'staging' | 'production';
  config?: EnvironmentConfig;
  createdAt: Date;
  updatedAt: Date;
}
```

### Environment Config

```typescript
interface EnvironmentConfig {
  // Database
  databaseUrl?: string;
  databaseName?: string;
  
  // API
  apiUrl?: string;
  apiKey?: string;
  
  // Services
  services?: {
    [key: string]: {
      url: string;
      credentials?: any;
    };
  };
  
  // Environment variables
  envVars?: {
    [key: string]: string;
  };
  
  // Feature flags
  featureFlags?: {
    [key: string]: boolean;
  };
  
  // Custom configuration
  custom?: any;
}
```

### Environment Types

- **dev** - Development environment
- **test** - Testing environment
- **staging** - Staging environment
- **production** - Production environment

---

## Environment Operations

### Create Environment

```typescript
// Create development environment
const devEnv = await environmentManager.createEnvironment(
  projectId,
  'dev',
  {
    databaseUrl: 'postgresql://localhost:5432/dev_db',
    apiUrl: 'http://localhost:3000',
    envVars: {
      NODE_ENV: 'development',
      LOG_LEVEL: 'debug',
    },
  }
);
```

### Get Environment

```typescript
// Get environment by ID
const env = await environmentManager.getEnvironment(environmentId);
```

### List Environments

```typescript
// List all environments for project
const environments = await environmentManager.listEnvironments(projectId);
```

### Update Environment

```typescript
// Update environment configuration
const updated = await environmentManager.updateEnvironment(
  environmentId,
  {
    databaseUrl: 'postgresql://new-host:5432/db',
    envVars: {
      ...existingEnvVars,
      NEW_VAR: 'value',
    },
  }
);
```

### Delete Environment

```typescript
// Delete environment
await environmentManager.deleteEnvironment(environmentId);
```

---

## Environment Validation

### Validation Process

1. **Required Fields** - Check required fields
2. **Type Validation** - Validate field types
3. **Value Validation** - Validate field values
4. **Dependency Validation** - Check dependencies
5. **Security Validation** - Check security settings

### Validation Result

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}
```

### Validation Rules

**Database:**
- URL format validation
- Connection validation
- Schema validation

**API:**
- URL format validation
- Authentication validation
- Endpoint validation

**Environment Variables:**
- Required variables
- Format validation
- Value validation

---

## Environment Switching

### Switch Environment

```typescript
// Switch to different environment
await switchEnvironment(environmentId);

// This:
// - Updates configuration
// - Validates environment
// - Updates connections
// - Refreshes UI
```

### Environment Context

Environment context is used for:
- Task execution
- Code generation
- Testing
- Deployment

---

## Environment Parity

### Parity Checking

Check environment parity:
- Configuration comparison
- Feature flag comparison
- Service availability
- Data consistency

### Parity Agent

**Location:** `src/core/agents/EnvironmentParityAgent.ts`

**Purpose:** Check environment parity

**Features:**
- Compare environments
- Detect differences
- Generate parity report
- Suggest fixes

---

## Environment Configuration

### Development Environment

**Typical Config:**
- Local database
- Local services
- Debug logging
- Hot reload
- Development tools

### Test Environment

**Typical Config:**
- Test database
- Mock services
- Test data
- Test logging
- Test tools

### Staging Environment

**Typical Config:**
- Staging database
- Staging services
- Production-like data
- Production logging
- Monitoring

### Production Environment

**Typical Config:**
- Production database
- Production services
- Production data
- Production logging
- Full monitoring
- Security hardening

---

## Usage Examples

### Create Multiple Environments

```typescript
// Create development environment
const dev = await environmentManager.createEnvironment(
  projectId,
  'dev',
  {
    databaseUrl: 'postgresql://localhost:5432/dev',
    apiUrl: 'http://localhost:3000',
    envVars: {
      NODE_ENV: 'development',
    },
  }
);

// Create staging environment
const staging = await environmentManager.createEnvironment(
  projectId,
  'staging',
  {
    databaseUrl: 'postgresql://staging-db:5432/staging',
    apiUrl: 'https://staging-api.example.com',
    envVars: {
      NODE_ENV: 'staging',
    },
  }
);

// Create production environment
const prod = await environmentManager.createEnvironment(
  projectId,
  'production',
  {
    databaseUrl: 'postgresql://prod-db:5432/prod',
    apiUrl: 'https://api.example.com',
    envVars: {
      NODE_ENV: 'production',
    },
  }
);
```

### Validate Environment

```typescript
// Validate environment
const validation = await validator.validateEnvironment(env);

if (!validation.isValid) {
  console.error('Validation errors:');
  for (const error of validation.errors) {
    console.error(`  ${error.field}: ${error.message}`);
  }
}
```

### Use Environment in Task

```typescript
// Create task with environment
const task = await taskRepository.create({
  projectId,
  title: 'Deploy to staging',
  type: 'deployment',
  environmentId: staging.id,
  status: 'to_do',
  createdBy: userId,
});

// Task execution uses environment configuration
```

---

## Related Modules

- **Task Management Module** - Tasks linked to environments
- **Execution Module** - Execution uses environment config
- **Project Management Module** - Environments linked to projects

---

## Summary

The Environment Management Module provides comprehensive multi-environment configuration management for the Coder IDE. With environment CRUD operations, validation, and environment-specific configuration, it enables proper environment management throughout the development lifecycle.
