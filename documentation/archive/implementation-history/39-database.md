# Database Module

**Category:** Backend Services  
**Location:** `server/database/`, `server/src/database/`  
**Last Updated:** 2025-01-27

---

## Overview

The Database Module provides database access, schema management, migrations, and data seeding for the Coder IDE backend. It uses Prisma ORM for type-safe database access and PostgreSQL as the primary database.

## Purpose

- Database connection management
- Prisma schema management
- Database migrations
- Data seeding
- Redis integration
- Type-safe database access

---

## Key Components

### 1. Database Client (`DatabaseClient.ts`)

**Location:** `server/src/database/DatabaseClient.ts`

**Purpose:** Prisma client management

**Features:**
- Prisma client initialization
- Connection management
- Health checks
- Connection pooling

**Key Methods:**
```typescript
getDatabaseClient(): PrismaClient
connectDatabase(): Promise<void>
disconnectDatabase(): Promise<void>
healthCheck(): Promise<boolean>
```

### 2. Prisma Schema (`schema.prisma`)

**Location:** `server/database/schema.prisma`

**Purpose:** Database schema definition

**Features:**
- Model definitions
- Relationships
- Indexes
- Constraints
- Enums

**Models Include:**
- User, Organization, Team
- Project, Task, Roadmap
- Milestone, Epic, Story
- Role, Permission, Membership
- Module, Environment
- Calendar, Messaging, Knowledge
- Review, Incident, Learning
- Architecture, Release
- Dependency, Debt, Pairing
- Capacity, Pattern, Compliance
- Innovation, Experiment
- And many more...

### 3. Migrations

**Location:** `server/database/migrations/`

**Purpose:** Database schema migrations

**Features:**
- Migration files
- Migration history
- Rollback support
- Migration validation

**Commands:**
```bash
npm run db:migrate      # Run migrations
npm run db:migrate:dev  # Create migration
npm run db:reset        # Reset database
```

### 4. Seed Scripts

**Location:** `server/src/database/seed.ts`

**Purpose:** Database seeding

**Features:**
- Initial data seeding
- Test data generation
- Seed functions

**Seed Scripts:**
- `seed.ts` - Main seed script
- `seedMCPServers.ts` - MCP server seeds
- `seedWidgets.ts` - Widget seeds

### 5. Redis Client (`RedisClient.ts`)

**Location:** `server/src/database/RedisClient.ts`

**Purpose:** Redis integration

**Features:**
- Redis connection
- Caching
- Session storage
- Rate limiting storage

---

## Database Schema

### Core Models

**User & Authentication:**
- `User` - User accounts
- `Session` - User sessions
- `AuthProvider` - OAuth providers

**Organization & Teams:**
- `Organization` - Organizations
- `OrganizationMembership` - Memberships
- `Team` - Teams
- `TeamMember` - Team members

**Projects & Tasks:**
- `Project` - Projects
- `Task` - Tasks
- `TaskAssignment` - Task assignments
- `TaskDependency` - Task dependencies

**Roadmaps:**
- `Roadmap` - Roadmaps
- `Milestone` - Milestones
- `Epic` - Epics
- `Story` - Stories

**RBAC:**
- `Role` - Roles
- `Permission` - Permissions
- `RolePermission` - Role-permission mappings
- `ResourcePermission` - Resource-level permissions

**Modules:**
- `Module` - Detected modules
- `Submodule` - Submodules

**Environments:**
- `Environment` - Environment configurations

**Productivity:**
- `CalendarEvent` - Calendar events
- `Message` - Messages
- `KnowledgeBase` - Knowledge base entries
- `CodeReview` - Code reviews
- `Incident` - Incidents
- `LearningResource` - Learning resources
- `Architecture` - Architecture definitions
- `Release` - Releases
- `Dependency` - Dependencies
- `TechnicalDebt` - Technical debt items
- `PairingSession` - Pair programming sessions
- `CapacityPlan` - Capacity plans
- `Pattern` - Design patterns
- `Compliance` - Compliance items
- `Innovation` - Innovation items
- `Experiment` - Experiments

---

## Database Operations

### Connection

```typescript
// Connect to database
await connectDatabase();

// Get database client
const db = getDatabaseClient();

// Use client
const users = await db.user.findMany();
```

### Queries

```typescript
// Find many
const users = await db.user.findMany({
  where: { isActive: true },
  include: { organizationMemberships: true },
});

// Find unique
const user = await db.user.findUnique({
  where: { id: userId },
});

// Create
const project = await db.project.create({
  data: {
    name: 'My Project',
    organizationId: 'org-123',
  },
});

// Update
const updated = await db.project.update({
  where: { id: projectId },
  data: { name: 'Updated Name' },
});

// Delete
await db.project.delete({
  where: { id: projectId },
});
```

### Transactions

```typescript
await db.$transaction(async (tx) => {
  const project = await tx.project.create({ data: {...} });
  const task = await tx.task.create({
    data: {
      projectId: project.id,
      ...taskData,
    },
  });
  return { project, task };
});
```

---

## Migrations

### Create Migration

```bash
# Create migration
npm run db:migrate:dev -- --name add_user_table

# This creates:
# - Migration file in migrations/
# - Updates schema.prisma
```

### Run Migrations

```bash
# Run pending migrations
npm run db:migrate

# In production
npm run db:migrate:deploy
```

### Migration Files

**Format:**
```
YYYYMMDDHHMMSS_migration_name/
  migration.sql
```

**Example:**
```
20250127120000_add_user_table/
  migration.sql
```

---

## Seeding

### Seed Database

```typescript
// Run seed script
npm run db:seed

// Seed includes:
// - System roles
// - System permissions
// - Default data
// - Test data (development)
```

### Seed Functions

```typescript
async function seed() {
  // Seed system roles
  await seedSystemRoles();
  
  // Seed permissions
  await seedPermissions();
  
  // Seed MCP servers
  await seedMCPServers();
  
  // Seed widgets
  await seedWidgets();
}
```

---

## Redis Integration

### Redis Client

```typescript
import { getRedisClient } from './database/RedisClient';

const redis = getRedisClient();

// Set value
await redis.set('key', 'value', 'EX', 3600); // Expire in 1 hour

// Get value
const value = await redis.get('key');

// Delete value
await redis.del('key');
```

### Use Cases

- **Caching** - Cache frequently accessed data
- **Sessions** - Store session data
- **Rate Limiting** - Track rate limits
- **Locks** - Distributed locks

---

## Health Checks

### Database Health

```typescript
// Check database health
const isHealthy = await healthCheck();

// Returns:
// - true if database is connected
// - false if database is disconnected
```

### Health Check Implementation

```typescript
async function healthCheck(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
}
```

---

## Type Safety

### Prisma Types

Prisma generates TypeScript types:
- Model types
- Input types
- Output types
- Relation types

### Type Usage

```typescript
import { User, Project, Task } from '@prisma/client';

// Use generated types
const user: User = await db.user.findUnique({ where: { id } });
const project: Project = await db.project.create({ data: {...} });
```

---

## Indexes

### Index Definition

Indexes defined in schema:

```prisma
model User {
  id    String @id @default(cuid())
  email String @unique
  
  @@index([email])
  @@index([organizationId, isActive])
}
```

### Performance Indexes

Common indexes:
- Unique constraints
- Foreign key indexes
- Composite indexes
- Full-text indexes (where supported)

---

## Relationships

### One-to-Many

```prisma
model Project {
  id   String @id
  tasks Task[]
}

model Task {
  id        String @id
  projectId String
  project   Project @relation(fields: [projectId], references: [id])
}
```

### Many-to-Many

```prisma
model User {
  id       String @id
  roles    RolePermission[]
}

model Role {
  id       String @id
  users    RolePermission[]
}

model RolePermission {
  userId String
  roleId String
  user   User @relation(fields: [userId], references: [id])
  role   Role @relation(fields: [roleId], references: [id])
  
  @@unique([userId, roleId])
}
```

---

## Usage Examples

### Query with Relations

```typescript
// Include relations
const project = await db.project.findUnique({
  where: { id: projectId },
  include: {
    tasks: {
      include: {
        assignments: true,
        dependencies: true,
      },
    },
    roadmap: {
      include: {
        milestones: {
          include: {
            epics: {
              include: {
                stories: true,
              },
            },
          },
        },
      },
    },
  },
});
```

### Complex Query

```typescript
// Complex query with filters
const tasks = await db.task.findMany({
  where: {
    projectId: projectId,
    status: {
      in: ['to_do', 'in_progress'],
    },
    OR: [
      { assignedTo: userId },
      { createdBy: userId },
    ],
  },
  orderBy: {
    priority: 'desc',
    createdAt: 'asc',
  },
  take: 20,
  skip: 0,
});
```

---

## Related Modules

- **API Server Module** - Uses database for routes
- **Services Module** - Uses database for business logic
- **Middleware Module** - Uses database for auth/RBAC

---

## Summary

The Database Module provides comprehensive database management for the Coder IDE backend. With Prisma ORM, migrations, seeding, and Redis integration, it enables type-safe, efficient database access throughout the application.
