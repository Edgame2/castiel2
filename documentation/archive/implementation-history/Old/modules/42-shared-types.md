# Shared Types Module

**Category:** Shared & Common  
**Location:** `src/shared/types/`  
**Last Updated:** 2025-01-27

---

## Overview

The Shared Types Module provides shared TypeScript types and interfaces used across the Coder IDE application. It ensures type safety and consistency between frontend, backend, and core modules.

## Purpose

- Shared type definitions
- Type safety across modules
- Interface contracts
- Type utilities
- Common type definitions

---

## Key Components

### 1. Type Definitions (`index.ts`)

**Location:** `src/shared/types/index.ts`

**Purpose:** Central type definitions

**Type Categories:**
- User & Authentication types
- Organization & Team types
- Project & Task types
- Roadmap types
- Module types
- Environment types
- AI & Planning types
- Execution types
- Context types
- Model types
- Agent types
- Productivity types
- And many more...

### 2. Type Validators (`TypeValidators.ts`)

**Location:** `src/shared/types/TypeValidators.ts`

**Purpose:** Type validation utilities

**Features:**
- Runtime type checking
- Type guards
- Type assertions
- Validation functions

---

## Type Categories

### User & Authentication

```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  authProviders: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
}
```

### Organization & Teams

```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  ownerUserId: string;
  isActive: boolean;
  settings?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  parentTeamId?: string;
  organizationId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Projects & Tasks

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: 'feature' | 'bug' | 'refactor' | 'test' | 'documentation';
  status: 'to_do' | 'in_progress' | 'blocked' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  createdBy: string;
  milestoneId?: string;
  epicId?: string;
  storyId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Roadmaps

```typescript
interface Roadmap {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Milestone {
  id: string;
  roadmapId: string;
  name: string;
  description?: string;
  targetDate?: Date;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

interface Epic {
  id: string;
  milestoneId: string;
  name: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

interface Story {
  id: string;
  epicId: string;
  name: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}
```

### AI & Planning

```typescript
interface Plan {
  id: string;
  title: string;
  description: string;
  intent: string;
  steps: PlanStep[];
  status: PlanStatus;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PlanStep {
  id: string;
  title: string;
  description: string;
  type: StepType;
  dependencies: string[];
  status: StepStatus;
  order: number;
}

interface ModelRequest {
  prompt: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  context?: any;
}

interface ModelResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

### Context

```typescript
interface ProjectContext {
  files: FileInfo[];
  dependencies: DependencyInfo[];
  ast: ASTInfo;
  git: GitInfo;
  embeddings: EmbeddingInfo[];
}

interface FileInfo {
  path: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  lastModified: Date;
}

interface ASTInfo {
  classes: ClassInfo[];
  functions: FunctionInfo[];
  interfaces: InterfaceInfo[];
  types: TypeInfo[];
  relationships: RelationshipInfo[];
}
```

### Modules

```typescript
interface Module {
  id: string;
  name: string;
  path: string;
  files: string[];
  dependencies: string[];
  confidence: number;
  projectId: string;
}

interface Submodule {
  id: string;
  moduleId: string;
  name: string;
  path: string;
  files: string[];
  dependencies: string[];
}
```

### Environments

```typescript
interface Environment {
  id: string;
  projectId: string;
  name: 'dev' | 'test' | 'staging' | 'production';
  config?: EnvironmentConfig;
  createdAt: Date;
  updatedAt: Date;
}

interface EnvironmentConfig {
  databaseUrl?: string;
  apiUrl?: string;
  services?: { [key: string]: any };
  envVars?: { [key: string]: string };
  featureFlags?: { [key: string]: boolean };
  custom?: any;
}
```

---

## Type Utilities

### Type Guards

```typescript
function isUser(obj: any): obj is User {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string';
}

function isProject(obj: any): obj is Project {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string';
}
```

### Type Assertions

```typescript
function assertUser(obj: any): asserts obj is User {
  if (!isUser(obj)) {
    throw new Error('Object is not a User');
  }
}
```

### Validation Functions

```typescript
function validateUser(user: any): User {
  if (!isUser(user)) {
    throw new Error('Invalid user object');
  }
  return user;
}
```

---

## Type Exports

### Main Export

```typescript
// Export all types
export * from './types';

// Export validators
export * from './TypeValidators';
```

### Selective Exports

```typescript
// Import specific types
import { User, Project, Task } from '@/shared/types';

// Import type categories
import type { UserTypes, ProjectTypes, AITypes } from '@/shared/types';
```

---

## Type Safety

### Cross-Module Type Safety

Types ensure consistency:
- Frontend ↔ Backend contracts
- IPC communication types
- API request/response types
- Database model types

### Type Generation

Types are:
- Manually defined
- Generated from Prisma schema (where applicable)
- Validated at compile time
- Validated at runtime (with validators)

---

## Usage Examples

### Use Shared Types

```typescript
import { User, Project, Task } from '@/shared/types';

// Type-safe function
function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  // Implementation
}

// Type-safe API response
interface GetProjectResponse {
  project: Project;
  tasks: Task[];
  roadmap?: Roadmap;
}
```

### Type Validation

```typescript
import { validateUser, isUser } from '@/shared/types';

// Validate at runtime
const user = validateUser(userData);

// Type guard
if (isUser(data)) {
  // data is User type
  console.log(user.email);
}
```

---

## Related Modules

- **All Modules** - Use shared types
- **Validation Module** - Uses types for validation
- **Database Module** - Types match Prisma models

---

## Summary

The Shared Types Module provides comprehensive type definitions for the Coder IDE application. With shared types across frontend, backend, and core modules, it ensures type safety, consistency, and reliable communication throughout the application.
