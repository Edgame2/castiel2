# Admin Role and User Management System - Full Implementation Plan

**Based on**: `IMPLEMENTATION_ANSWERS.md` + `ADDITIONAL_IMPLEMENTATION_ANSWERS.md`  
**Priority**: Security & Flexibility  
**Migration Concern**: Data loss acceptable

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Phase 1: Database & Core Infrastructure](#phase-1-database--core-infrastructure)
4. [Phase 2: Authentication & Session Management](#phase-2-authentication--session-management)
5. [Phase 3: Organization Management](#phase-3-organization-management)
6. [Phase 4: User Management & Membership](#phase-4-user-management--membership)
7. [Phase 5: Invitation System](#phase-5-invitation-system)
8. [Phase 6: Role & Permission System](#phase-6-role--permission-system)
9. [Phase 7: RBAC Middleware & Enforcement](#phase-7-rbac-middleware--enforcement)
10. [Phase 8: Audit Logging](#phase-8-audit-logging)
11. [Phase 9: Email System](#phase-9-email-system)
12. [Phase 10: Security & Validation](#phase-10-security--validation)
13. [Phase 11: Background Jobs](#phase-11-background-jobs)
14. [Phase 12: Frontend Components](#phase-12-frontend-components)
15. [Phase 13: IPC Handlers](#phase-13-ipc-handlers)
16. [Phase 14: Testing](#phase-14-testing)
15. [Phase 15: Documentation](#phase-15-documentation)
16. [Phase 16: Deployment & Monitoring](#phase-16-deployment--monitoring)

---

## Architecture Overview

### Technology Stack

- **Database**: PostgreSQL (Prisma ORM)
- **Session Storage**: Redis (active sessions, cache) - Managed service (AWS ElastiCache/Redis Cloud) with Sentinel for HA
- **Background Jobs**: Bull/BullMQ (Redis-backed)
- **Email Service**: SendGrid or AWS SES
- **Email Templates**: Handlebars (filesystem-based, DB overrides for future)
- **Frontend State**: Zustand
- **Testing**: Jest (unit/integration), Playwright (E2E), Faker.js for test factories
- **API Documentation**: OpenAPI 3.0 (Swagger)
- **Error Tracking**: Sentry
- **Monitoring**: Prometheus + Grafana (self-hosted) or Datadog (paid)
- **Logging**: Winston (structured JSON logging)

### Key Design Decisions

1. **Super Admin**: Special bypass flag (`is_super_admin`), not explicit permissions
2. **Permissions**: Global (shared), Roles: Organization-scoped
3. **Single Role**: One role per user per organization (simplicity)
4. **Wildcard Permissions**: Support `projects.*`, `projects.project.*`, etc.
5. **Resource-Level Permissions**: Optional table for granular access
6. **Sessions**: Redis for active, DB for audit trail
7. **Soft Deletes**: 90-day grace period, then permanent deletion
8. **Audit Logs**: 90 days hot storage, 2 years cold storage (S3)

---

## Database Schema

### Complete Prisma Schema

**File**: `server/database/schema.prisma`

```prisma
// Enhanced User Model
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String?   // Nullable for OAuth-only users
  firstName       String?   @db.VarChar(100)
  lastName        String?   @db.VarChar(100)
  name            String?   // Legacy field, computed from firstName+lastName
  googleId        String?   @unique
  picture         String?   // Legacy, use avatarUrl
  avatarUrl       String?   // Supports external URLs and uploads
  phoneNumber     String?   // E.164 format: +353871234567
  authProviders   Json?     // Track linked auth methods: ["google", "email"]
  isEmailVerified Boolean   @default(false)
  isActive        Boolean   @default(true) // Global account status
  lastLoginAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime? // Soft delete, permanent after 90 days

  // Relationships
  profile              UserProfile?
  organizationMemberships OrganizationMembership[]
  createdOrganizations Organization[] @relation("OrganizationCreator")
  invitations          Invitation[] @relation("Inviter")
  sessions             Session[]
  auditLogs            AuditLog[]
  loginAttempts        LoginAttempt[]
  resourcePermissions  ResourcePermission[]
  
  // ... existing relationships ...

  @@index([email])
  @@index([googleId])
  @@index([isActive, deletedAt])
  @@index([deletedAt])
}

// Login Attempts Tracking
model LoginAttempt {
  id        String   @id @default(cuid())
  userId    String?
  email     String
  ipAddress String?
  userAgent String?
  success   Boolean  @default(false)
  createdAt DateTime @default(now())

  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([email, createdAt])
  @@index([ipAddress, createdAt])
}

// Enhanced Organization Model
model Organization {
  id              String   @id @default(cuid())
  name            String
  slug            String   @unique // URL-friendly, globally unique
  description     String?
  logoUrl         String?
  ownerUserId     String
  isActive        Boolean  @default(true)
  settings        Json?    // Max 64KB, org-specific configs
  subscriptionTier String? // free, pro, enterprise (nullable for now)
  subscriptionStatus String? // active, cancelled, expired (nullable)
  memberLimit     Int      @default(500) // Soft limit
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime? // Soft delete, 30-day grace period

  // Relationships
  creator             User                  @relation("OrganizationCreator", fields: [ownerUserId], references: [id])
  memberships         OrganizationMembership[]
  roles               Role[]
  invitations        Invitation[]
  auditLogs          AuditLog[]
  resourcePermissions ResourcePermission[]
  teams               Team[]
  projects            Project[] // Via teams

  @@index([slug])
  @@index([ownerUserId])
  @@index([isActive, deletedAt])
  @@index([deletedAt])
}

// Organization Membership (User-Org Relationship)
model OrganizationMembership {
  id              String   @id @default(cuid())
  userId          String
  organizationId  String
  roleId          String
  status          String   @default("active") // active, invited, suspended, deactivated
  invitedByUserId String?
  invitedAt       DateTime?
  joinedAt        DateTime?
  lastAccessAt    DateTime? // Updated max every 5 minutes
  expiresAt       DateTime? // Nullable, for temporary access
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  role            Role         @relation(fields: [roleId], references: [id])
  inviter         User?        @relation("MembershipInviter", fields: [invitedByUserId], references: [id], onDelete: SetNull)

  @@unique([userId, organizationId, status]) // Allow one active membership
  @@index([userId])
  @@index([organizationId])
  @@index([roleId])
  @@index([status])
  @@index([expiresAt])
  // Composite indexes for common queries
  @@index([organizationId, status, createdAt])  // List active members by creation
  @@index([userId, status])                      // User's active memberships
  @@index([organizationId, roleId])             // Members by role
}

// Enhanced Role Model (Organization-Scoped)
model Role {
  id              String   @id @default(cuid())
  organizationId  String? // Nullable for future global roles, required for custom
  name            String   // e.g., "Super Admin", "Admin", "Developer"
  description     String?
  isSystemRole    Boolean  @default(false)
  isCustomRole    Boolean  @default(false)
  isSuperAdmin    Boolean  @default(false) // Bypass flag for Super Admin
  createdByUserId String?  // Who created custom role
  archivedAt      DateTime? // Soft delete alternative
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relationships
  permissions         RolePermission[]
  memberships         OrganizationMembership[]
  invitations         Invitation[]
  organization        Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  creator             User?         @relation("RoleCreator", fields: [createdByUserId], references: [id], onDelete: SetNull)

  @@unique([organizationId, name]) // Unique within organization
  @@index([organizationId])
  @@index([isSystemRole])
  @@index([isSuperAdmin])
}

// Enhanced Permission Model (Global)
model Permission {
  id                String   @id @default(cuid())
  module            String   // e.g., "projects", "teams", "users"
  resource          String   // e.g., "project", "task", "team_member"
  action            String   // e.g., "create", "read", "update", "delete", "manage"
  scope             String?  // e.g., "own", "team", "organization", "all"
  code              String   @unique // e.g., "projects.project.create"
  displayName       String   // Human-readable
  description       String?
  isSystemPermission Boolean @default(true)
  createdAt         DateTime @default(now())

  rolePermissions   RolePermission[]

  @@index([code])
  @@index([module, resource, action])
  @@index([module])
}

// Role-Permission Mapping
model RolePermission {
  id           String   @id @default(cuid())
  roleId       String
  permissionId String
  grantedAt    DateTime @default(now())
  grantedByUserId String? // Who granted (for audit)

  role         Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  granter      User?    @relation("PermissionGranter", fields: [grantedByUserId], references: [id], onDelete: SetNull)

  @@unique([roleId, permissionId])
  @@index([roleId])
  @@index([permissionId])
}

// Resource-Level Permissions (Optional Granular Access)
model ResourcePermission {
  id            String   @id @default(cuid())
  userId        String
  organizationId String
  resourceType  String   // project, team, plan, task, etc.
  resourceId    String   // UUID of specific resource
  permissionLevel String // owner, editor, viewer, custom
  grantedByUserId String
  grantedAt     DateTime @default(now())
  expiresAt     DateTime? // Nullable for permanent grants

  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization  Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  granter       User         @relation("ResourcePermissionGranter", fields: [grantedByUserId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId, resourceType, resourceId])
  @@index([userId, organizationId])
  @@index([resourceType, resourceId])
  @@index([expiresAt])
}

// Invitation Model
model Invitation {
  id              String   @id @default(cuid())
  organizationId  String
  email           String
  roleId          String
  token           String   @unique // Single-use token
  invitedByUserId String
  message         String?  @db.VarChar(500) // Custom message from inviter
  status          String   @default("pending") // pending, accepted, expired, cancelled
  expiresAt       DateTime // 7 days default
  acceptedAt      DateTime?
  resendCount     Int      @default(0) // Track resends (max 5)
  lastResentAt    DateTime?
  createdAt       DateTime @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  role            Role         @relation(fields: [roleId], references: [id])
  inviter         User         @relation("Inviter", fields: [invitedByUserId], references: [id])

  @@index([organizationId])
  @@index([email])
  @@index([token])
  @@index([status])
  @@index([expiresAt])
  @@index([email, organizationId, status])
}

// Session Model (Redis primary, DB for audit)
model Session {
  id              String   @id @default(cuid())
  userId          String
  token           String   @unique // JWT token ID
  organizationId  String?  // Current active org
  deviceInfo      String?  // Device fingerprint
  ipAddress       String?
  userAgent       String?
  isRememberMe    Boolean  @default(false)
  expiresAt       DateTime
  lastActivityAt DateTime  @default(now())
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@index([organizationId])
}

// Enhanced AuditLog Model
model AuditLog {
  id                String   @id @default(cuid())
  organizationId    String
  userId            String?  // Nullable for system actions
  action            String   // e.g., "user.role.changed"
  resourceType      String   // e.g., "user", "project"
  resourceId        String?
  changes           Json?    // before/after values (redacted)
  ipAddress         String?
  userAgent         String?
  isSuperAdminAction Boolean @default(false) // Flag for privileged actions
  roleAtTime        String?  // User's role when action performed
  createdAt         DateTime @default(now())

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user              User?         @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([organizationId, createdAt])
  @@index([userId, createdAt])
  @@index([action])
  @@index([resourceType])
  @@index([createdAt])
  @@index([isSuperAdminAction])
  @@index([resourceType, resourceId])   // Resource-specific logs
}

// Email Log Model (Track email delivery status)
model EmailLog {
  id              String   @id @default(uuid())
  messageId       String   @unique  // Provider's message ID
  to              String
  from            String
  subject         String
  templateId      String?
  organizationId  String?
  userId          String?
  
  // Status tracking
  status          EmailStatus  // sent, delivered, bounced, opened, clicked, failed
  sentAt          DateTime?
  deliveredAt     DateTime?
  openedAt        DateTime?
  clickedAt       DateTime?
  bouncedAt       DateTime?
  failedAt        DateTime?
  
  // Error details
  errorMessage    String?
  errorCode       String?
  
  // Metadata
  provider        String   // sendgrid, ses
  providerResponse Json?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([messageId])
  @@index([userId, createdAt])
  @@index([organizationId, createdAt])
  @@index([status, createdAt])
}

enum EmailStatus {
  queued
  sent
  delivered
  bounced
  opened
  clicked
  failed
}

// Password History Model
model PasswordHistory {
  id           String   @id @default(uuid())
  userId       String
  passwordHash String
  createdAt    DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt])
}
```

---

## Phase 1: Database & Core Infrastructure

### 1.1 Update Prisma Schema

**File**: `server/database/schema.prisma`

**Tasks**:
1. Add all new models (User enhancements, Organization, OrganizationMembership, Role, Permission, Invitation, Session, AuditLog, LoginAttempt, ResourcePermission)
2. Update existing models with new fields
3. Add all relationships and indexes
4. Run `npx prisma format` to validate
5. Generate Prisma client: `npx prisma generate`

### 1.2 Create Database Migration

**File**: `server/database/migrations/YYYYMMDDHHMMSS_add_user_management_system.sql`

**Migration Strategy**:
- **Dev**: `prisma migrate dev` - Creates migration + applies immediately
- **Staging/Production**: `prisma migrate deploy` - Only applies existing migrations
- **Linear migration history** - One developer creates migration at a time
- **Combined approach** - Single migration file with schema + data changes

**Tasks**:
1. Create migration script using Prisma migrate
2. Include data migration for existing users:
   - Create default organization
   - Migrate existing roles to org-scoped
   - Create OrganizationMembership records
3. Add composite indexes (see Phase 1.6)
4. Add partial indexes via raw SQL (PostgreSQL-specific)
5. Test migration on staging database
6. Backup production database before migration

**Migration Script Template**:
```typescript
// server/src/database/migrations/migrateExistingData.ts
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function migrateExistingData() {
  // 1. Create default organization for existing users
  const defaultOrg = await db.organization.create({
    data: {
      name: 'Default Organization',
      slug: 'default-org',
      ownerUserId: 'system', // Or first admin user
      // ...
    }
  });

  // 2. Migrate existing roles
  // 3. Create memberships
  // 4. Update existing data
}

// Raw SQL for partial indexes (PostgreSQL)
await db.$executeRaw`
  CREATE INDEX idx_active_memberships 
  ON organization_memberships (organization_id, user_id) 
  WHERE status = 'active' AND deleted_at IS NULL;
`;

await db.$executeRaw`
  CREATE INDEX idx_pending_invitations 
  ON invitations (organization_id, email) 
  WHERE status = 'pending';
`;
```

### 1.3 Prisma Client Extensions (Soft Delete)

**File**: `server/src/database/DatabaseClient.ts` (update existing)

```typescript
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

// Extend Prisma Client to auto-filter soft deletes
const basePrisma = new PrismaClient();

export const prisma = basePrisma.$extends({
  model: {
    $allModels: {
      async findMany<T>(args?: any) {
        return (this as any).findMany({
          ...args,
          where: {
            ...args?.where,
            deletedAt: null
          }
        });
      },
      async findFirst<T>(args?: any) {
        return (this as any).findFirst({
          ...args,
          where: {
            ...args?.where,
            deletedAt: null
          }
        });
      },
      async findUnique<T>(args: any) {
        const result = await (this as any).findUnique(args);
        if (result && result.deletedAt) return null;
        return result;
      },
    }
  }
});

// Explicit method to include deleted
export async function findManyIncludingDeleted<T>(
  model: string,
  args?: any
): Promise<T[]> {
  return (basePrisma as any)[model].findMany(args);
}

export function getDatabaseClient() {
  return prisma;
}
```

### 1.4 Setup Redis Connection

**File**: `server/src/database/RedisClient.ts`

```typescript
import Redis from 'ioredis';

// Use managed Redis service (AWS ElastiCache, Redis Cloud) for production
// For <1000 users: Single Redis instance
// For >1000 users: Redis Sentinel (master-replica with automatic failover)

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    if (times > 10) return new Error('Redis connection failed');
    return Math.min(times * 50, 2000); // Exponential backoff, max 2s
  },
  // Sentinel configuration (if using)
  sentinels: process.env.REDIS_SENTINELS?.split(',').map(host => ({
    host: host.split(':')[0],
    port: parseInt(host.split(':')[1] || '26379')
  })),
  name: process.env.REDIS_MASTER_NAME || 'mymaster',
});

// Graceful Redis failure handling
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
  // Application continues, falls back to database
});

export { redis };
export default redis;
```

### 1.5 Cache Key Management

**File**: `server/src/utils/cacheKeys.ts`

```typescript
// Cache key naming convention with versioning
const VERSION = 'v2'; // Update when schema changes

export const cacheKeys = {
  userPermissions: (userId: string, orgId: string) => 
    `${VERSION}:perms:user:${userId}:org:${orgId}`,
  
  userMemberships: (userId: string) => 
    `${VERSION}:memberships:user:${userId}`,
  
  orgSettings: (orgId: string) => 
    `${VERSION}:settings:org:${orgId}`,
  
  rolePermissions: (roleId: string) => 
    `${VERSION}:perms:role:${roleId}`,
  
  sessionData: (sessionId: string) => 
    `session:${sessionId}`, // No version (short-lived)
  
  rateLimitCounter: (endpoint: string, userId: string) => 
    `ratelimit:${endpoint}:user:${userId}`,
  
  sessionActivity: (sessionId: string) => 
    `session_activity:${sessionId}`,
  
  sessionBlacklist: (sessionId: string) => 
    `session_blacklist:${sessionId}`,
  
  loginAttempts: (email: string) => 
    `login_attempts:${email}`,
  
  accountLocked: (email: string) => 
    `account_locked:${email}`,
  
  emailRateLimit: (orgId: string) => 
    `email-ratelimit:org:${orgId}`,
};
```

### 1.6 Setup Bull Queue

**File**: `server/src/queue/QueueManager.ts`

```typescript
import Queue from 'bull';
import { redis } from '../database/RedisClient';

// Job priority levels
export enum JobPriority {
  CRITICAL = 1,    // Password resets, security alerts
  HIGH = 5,        // Invitations, user notifications
  NORMAL = 10,     // General emails, data processing
  LOW = 20         // Bulk operations, reports, cleanup tasks
}

// Email queue - High priority, rate limited
export const emailQueue = new Queue('email', { 
  redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000  // 5s, 25s, 125s
    },
    removeOnComplete: true,
    removeOnFail: false
  },
  limiter: {
    max: 50,      // Max 50 jobs
    duration: 1000 // Per second (SendGrid limit: 100/sec)
  }
});

// Critical queue - Password resets, security
export const criticalQueue = new Queue('critical', {
  redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'linear',
      delay: 30000  // 30s, 60s, 90s, 120s, 150s
    },
    priority: JobPriority.CRITICAL
  },
  limiter: {
    max: 100,
    duration: 1000
  }
});

// Bulk operations queue - Low priority, no retries
export const bulkOperationQueue = new Queue('bulk-operations', {
  redis,
  defaultJobOptions: {
    attempts: 1,  // Don't retry bulk operations (too expensive)
    backoff: 'off',
    priority: JobPriority.LOW
  }
});

// Audit archive queue
export const auditArchiveQueue = new Queue('audit-archive', {
  redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000  // 1 min, 4 min, 16 min
    },
    priority: JobPriority.LOW
  }
});

// Cleanup queue
export const cleanupQueue = new Queue('cleanup', {
  redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 60000  // 1 minute
    },
    priority: JobPriority.LOW
  }
});

// Job monitoring
emailQueue.on('failed', async (job, err) => {
  console.error('Email job failed', {
    jobId: job.id,
    jobType: job.name,
    attempts: job.attemptsMade,
    error: err
  });
  
  // Alert if critical job failed
  if (job.name === 'password-reset' && job.attemptsMade >= 5) {
    // TODO: Send alert to ops
  }
});

// Monitor queue length
setInterval(async () => {
  const counts = await emailQueue.getJobCounts();
  if (counts.waiting > 1000) {
    console.warn('Email queue length exceeded 1000', counts);
    // TODO: Alert ops
  }
}, 10000); // Every 10 seconds

// Detect stuck jobs
setInterval(async () => {
  const activeJobs = await emailQueue.getActive();
  const now = Date.now();
  
  for (const job of activeJobs) {
    const processingTime = now - (job.processedOn || 0);
    if (processingTime > 30 * 60 * 1000) { // 30 minutes
      console.error('Stuck job detected', { jobId: job.id, processingTime });
      await job.moveToFailed(new Error('Job timeout - stuck for >30min'));
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

### 1.7 Environment Variables

**File**: `.env.example`

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/coder"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=30d

# Email (SendGrid or AWS SES)
EMAIL_PROVIDER=sendgrid # or 'ses'
SENDGRID_API_KEY=
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Application
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:3001

# Rate Limiting
RATE_LIMIT_ENABLED=true

# Audit Logs
AUDIT_LOG_RETENTION_DAYS=90
AUDIT_LOG_COLD_STORAGE_DAYS=730
S3_BUCKET_NAME=audit-logs-archive

# Redis Sentinel (optional, for HA)
REDIS_SENTINELS=redis1:26379,redis2:26379,redis3:26379
REDIS_MASTER_NAME=mymaster

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
PROMETHEUS_PORT=9090
SENTRY_DSN=
```

---

## Phase 2: Authentication & Session Management

### 2.1 Password Utilities

**File**: `server/src/utils/passwordUtils.ts`

```typescript
import bcrypt from 'bcrypt';
import { checkPassword } from 'hibp'; // HaveIBeenPwned

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function isPasswordBreached(
  password: string
): Promise<boolean> {
  try {
    const count = await checkPassword(password);
    return count > 0;
  } catch (error) {
    // If API fails, allow password (fail open for UX)
    console.error('HIBP check failed:', error);
    return false;
  }
}

export async function validatePassword(
  password: string,
  user?: { email?: string; firstName?: string; lastName?: string }
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  // Common password check
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password.');
  }
  
  // Personal info check
  if (user?.email && password.toLowerCase().includes(user.email.split('@')[0].toLowerCase())) {
    errors.push('Password should not contain your email');
  }
  
  if (user?.firstName && password.toLowerCase().includes(user.firstName.toLowerCase())) {
    errors.push('Password should not contain your name');
  }
  
  // Breach check (HaveIBeenPwned)
  const breachCount = await isPasswordBreached(password);
  if (breachCount) {
    errors.push(
      `This password has been exposed in ${breachCount} data breaches. ` +
      `Please choose a different password.`
    );
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  // Don't enforce complexity (as per answers)
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### 2.2 Login Attempts Service

**File**: `server/src/services/loginAttemptService.ts`

```typescript
import { getDatabaseClient } from '../database/DatabaseClient';
import { redis } from '../database/RedisClient';

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_WINDOW = 15 * 60; // 15 minutes in seconds
const LOCKOUT_DURATION = 30 * 60; // 30 minutes

export async function recordLoginAttempt(
  email: string,
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null,
  success: boolean
): Promise<void> {
  const db = getDatabaseClient();
  
  // Store in database for audit
  await db.loginAttempt.create({
    data: {
      email,
      userId,
      ipAddress,
      userAgent,
      success,
    },
  });
  
  // Track in Redis for rate limiting
  if (!success) {
    const key = `login_attempts:${email}`;
    const attempts = await redis.incr(key);
    await redis.expire(key, LOCKOUT_WINDOW);
    
    if (attempts >= LOCKOUT_ATTEMPTS) {
      const lockoutKey = `account_locked:${email}`;
      await redis.setex(lockoutKey, LOCKOUT_DURATION, '1');
    }
  } else {
    // Clear attempts on success
    await redis.del(`login_attempts:${email}`);
    await redis.del(`account_locked:${email}`);
  }
}

export async function isAccountLocked(email: string): Promise<boolean> {
  const locked = await redis.get(`account_locked:${email}`);
  return locked === '1';
}
```

### 2.3 Session Service

**File**: `server/src/services/sessionService.ts`

```typescript
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { getDatabaseClient } from '../database/DatabaseClient';
import { redis } from '../database/RedisClient';
import { cacheKeys } from '../utils/cacheKeys';

// JWT Secret rotation support
const JWT_SECRETS = [
  { id: 'current', secret: process.env.JWT_SECRET!, isActive: true },
  { id: 'old', secret: process.env.JWT_SECRET_OLD, isActive: false }
].filter(s => s.secret);

const ACCESS_TOKEN_EXPIRES_IN = '8h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const MAX_CONCURRENT_SESSIONS = 10;

// Device fingerprinting
function generateFingerprint(userAgent: string | null, acceptLanguage?: string): string {
  const components = [
    userAgent || '',
    acceptLanguage || '',
  ];
  
  const fingerprint = components.join('|');
  return createHash('sha256').update(fingerprint).digest('hex');
}

interface SessionData {
  userId: string;
  organizationId?: string;
  roleId?: string;
  isSuperAdmin?: boolean;
}

export async function createSession(
  userId: string,
  organizationId: string | null,
  isRememberMe: boolean,
  ipAddress: string | null,
  userAgent: string | null,
  deviceInfo: string | null
): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
  const db = getDatabaseClient();
  
  // Get user's role in organization
  const membership = organizationId
    ? await db.organizationMembership.findFirst({
        where: {
          userId,
          organizationId,
          status: 'active',
        },
        include: { role: true },
      })
    : null;
  
  // Enforce concurrent session limit
  const sessionCount = await db.session.count({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
  });
  
  if (sessionCount >= MAX_CONCURRENT_SESSIONS) {
    // Revoke oldest session
    const oldestSession = await db.session.findFirst({
      where: { userId },
      orderBy: { lastActivityAt: 'asc' },
    });
    if (oldestSession) {
      await revokeSession(oldestSession.id);
    }
  }
  
  // Generate tokens
  const sessionId = randomBytes(32).toString('hex');
  const expiresIn = isRememberMe ? REFRESH_TOKEN_EXPIRES_IN : ACCESS_TOKEN_EXPIRES_IN;
  const expiresAt = new Date(Date.now() + parseExpiresIn(expiresIn));
  
  const sessionData: SessionData = {
    userId,
    organizationId: organizationId || undefined,
    roleId: membership?.roleId,
    isSuperAdmin: membership?.role.isSuperAdmin || false,
  };
  
  // Sign with current secret (includes secretId for rotation support)
  const currentSecret = JWT_SECRETS.find(s => s.isActive)!;
  const accessToken = jwt.sign(
    { ...sessionData, secretId: currentSecret.id },
    currentSecret.secret,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      jwtid: sessionId,
    }
  );
  
  const refreshToken = jwt.sign(
    { userId, sessionId, type: 'refresh', secretId: currentSecret.id },
    currentSecret.secret,
    { expiresIn }
  );
  
  // Generate device fingerprint
  const deviceFingerprint = generateFingerprint(userAgent);
  
  // Store in Redis (primary)
  const redisKey = cacheKeys.sessionData(sessionId);
  await redis.setex(
    redisKey,
    Math.floor(expiresAt.getTime() / 1000) - Math.floor(Date.now() / 1000),
    JSON.stringify({
      ...sessionData,
      lastActivityAt: new Date().toISOString(),
      fingerprint: deviceFingerprint,
    })
  );
  
  // Store in DB for audit
  await db.session.create({
    data: {
      id: sessionId,
      userId,
      token: sessionId,
      organizationId,
      deviceInfo: deviceFingerprint,
      ipAddress,
      userAgent,
      isRememberMe,
      expiresAt,
    },
  });
  
  return { accessToken, refreshToken, sessionId };
}

export async function validateSession(
  sessionId: string,
  userAgent?: string | null
): Promise<SessionData | null> {
  // Check Redis first
  const cached = await redis.get(cacheKeys.sessionData(sessionId));
  if (cached) {
    const session = JSON.parse(cached);
    
    // Validate device fingerprint if provided
    if (userAgent && session.fingerprint) {
      const currentFingerprint = generateFingerprint(userAgent);
      if (session.fingerprint !== currentFingerprint) {
        // Fingerprint mismatch - log but allow (may be browser update)
        console.warn('Session fingerprint mismatch', { sessionId });
        // Could require re-auth here for stricter security
      }
    }
    
    return session;
  }
  
  // Check blacklist
  const blacklisted = await redis.get(cacheKeys.sessionBlacklist(sessionId));
  if (blacklisted) {
    return null;
  }
  
  // Fallback to DB
  const db = getDatabaseClient();
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        include: {
          organizationMemberships: {
            where: { status: 'active' },
            include: { role: true },
          },
        },
      },
    },
  });
  
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  
  const membership = session.organizationId
    ? session.user.organizationMemberships.find(
        (m) => m.organizationId === session.organizationId
      )
    : null;
  
  return {
    userId: session.userId,
    organizationId: session.organizationId || undefined,
    roleId: membership?.roleId,
    isSuperAdmin: membership?.role.isSuperAdmin || false,
  };
}

export async function revokeSession(sessionId: string): Promise<void> {
  // Add to blacklist
  const db = getDatabaseClient();
  const session = await db.session.findUnique({
    where: { id: sessionId },
  });
  
  if (session) {
    const ttl = Math.max(
      0,
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
    );
    await redis.setex(cacheKeys.sessionBlacklist(sessionId), ttl, '1');
    
    // Delete from Redis
    await redis.del(cacheKeys.sessionData(sessionId));
    
    // Mark as deleted in DB
    await db.session.delete({ where: { id: sessionId } });
  }
}

// JWT Token verification with rotation support
export function verifyToken(token: string): any {
  const decoded = jwt.decode(token, { complete: true }) as any;
  if (!decoded?.payload?.secretId) {
    throw new Error('Invalid token format');
  }
  
  const secret = JWT_SECRETS.find(s => s.id === decoded.payload.secretId);
  if (!secret) {
    throw new Error('Invalid token secret');
  }
  
  return jwt.verify(token, secret.secret);
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  // Throttle: only update every 5 minutes
  const lastUpdate = await redis.get(cacheKeys.sessionActivity(sessionId));
  const now = Date.now();
  
  if (!lastUpdate || now - parseInt(lastUpdate) > 5 * 60 * 1000) {
    await redis.set(cacheKeys.sessionActivity(sessionId), now.toString());
    
    const db = getDatabaseClient();
    await db.session.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });
  }
}

// Session hijacking detection
export async function detectHijacking(
  sessionId: string,
  currentIp: string | null,
  currentUserAgent: string | null
): Promise<{ suspicious: boolean; reasons: string[] }> {
  const db = getDatabaseClient();
  const session = await db.session.findUnique({
    where: { id: sessionId },
  });
  
  if (!session) {
    return { suspicious: false, reasons: [] };
  }
  
  const reasons: string[] = [];
  
  // Check fingerprint change
  const currentFingerprint = generateFingerprint(currentUserAgent);
  if (session.deviceInfo && session.deviceInfo !== currentFingerprint) {
    reasons.push('fingerprint_mismatch');
  }
  
  // Check IP geolocation change (if implemented)
  // For now, just log IP changes
  if (session.ipAddress && currentIp && session.ipAddress !== currentIp) {
    // Could check geolocation here
    reasons.push('ip_changed');
  }
  
  // High confidence hijacking: impossible travel
  // (Would require geolocation service)
  
  if (reasons.includes('impossible_travel')) {
    // Force re-authentication
    await revokeSession(sessionId);
  }
  
  return {
    suspicious: reasons.length > 0,
    reasons
  };
}

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 8 * 60 * 60 * 1000; // Default 8 hours
  
  const [, value, unit] = match;
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  
  return parseInt(value) * multipliers[unit];
}
```

### 2.4 Enhanced Auth Routes

**File**: `server/src/routes/auth.ts` (update existing)

**New Endpoints**:
- `POST /api/auth/register` - Email/password registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (revoke session)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/link-oauth` - Link OAuth provider to existing account

**Implementation Details**:
- Email verification required for email/password users
- Password reset tokens expire in 1 hour
- Email verification tokens expire in 24 hours
- Support "Remember Me" checkbox (extends session to 30 days)
- Track login attempts and lock accounts after 5 failed attempts

---

## Phase 3: Organization Management

### 3.1 Organization Service

**File**: `server/src/services/organizationService.ts`

```typescript
import { getDatabaseClient } from '../database/DatabaseClient';
import { slugify } from '../utils/stringUtils';
import { auditService } from './auditService';

export async function createOrganization(
  userId: string,
  name: string,
  slug?: string,
  description?: string
) {
  const db = getDatabaseClient();
  
  // Generate slug if not provided
  const finalSlug = slug || slugify(name);
  
  // Validate slug uniqueness
  const existing = await db.organization.findUnique({
    where: { slug: finalSlug },
  });
  
  if (existing) {
    throw new Error('Organization slug already exists');
  }
  
  // Create organization
  const organization = await db.organization.create({
    data: {
      name,
      slug: finalSlug,
      description,
      ownerUserId: userId,
      isActive: true,
    },
  });
  
  // Get Super Admin role (created during seed)
  const superAdminRole = await db.role.findFirst({
    where: {
      organizationId: organization.id,
      isSuperAdmin: true,
    },
  });
  
  if (!superAdminRole) {
    throw new Error('Super Admin role not found');
  }
  
  // Create membership for creator
  await db.organizationMembership.create({
    data: {
      userId,
      organizationId: organization.id,
      roleId: superAdminRole.id,
      status: 'active',
      joinedAt: new Date(),
    },
  });
  
  // Log audit
  await auditService.log({
    organizationId: organization.id,
    userId,
    action: 'organization.created',
    resourceType: 'organization',
    resourceId: organization.id,
    changes: { name, slug: finalSlug },
  });
  
  return organization;
}

export async function updateOrganization(
  organizationId: string,
  userId: string,
  updates: {
    name?: string;
    slug?: string;
    description?: string;
    logoUrl?: string;
    settings?: Record<string, any>;
  }
) {
  const db = getDatabaseClient();
  
  // Check permissions
  const hasPermission = await checkPermission(
    userId,
    organizationId,
    'settings.organization.update'
  );
  
  if (!hasPermission) {
    throw new Error('Permission denied');
  }
  
  const before = await db.organization.findUnique({
    where: { id: organizationId },
  });
  
  // Validate slug if changed
  if (updates.slug && updates.slug !== before?.slug) {
    const existing = await db.organization.findUnique({
      where: { slug: updates.slug },
    });
    if (existing) {
      throw new Error('Slug already taken');
    }
  }
  
  // Validate settings JSON size (64KB max)
  if (updates.settings) {
    const size = JSON.stringify(updates.settings).length;
    if (size > 65536) {
      throw new Error('Settings JSON exceeds 64KB limit');
    }
  }
  
  const organization = await db.organization.update({
    where: { id: organizationId },
    data: updates,
  });
  
  // Log audit
  await auditService.log({
    organizationId,
    userId,
    action: 'organization.updated',
    resourceType: 'organization',
    resourceId: organizationId,
    changes: { before, after: organization },
  });
  
  return organization;
}

export async function deactivateOrganization(
  organizationId: string,
  userId: string
) {
  const db = getDatabaseClient();
  
  // Check if user is Super Admin
  const membership = await db.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: 'active',
    },
    include: { role: true },
  });
  
  if (!membership || !membership.role.isSuperAdmin) {
    throw new Error('Only Super Admin can deactivate organization');
  }
  
  const organization = await db.organization.update({
    where: { id: organizationId },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });
  
  // Log audit
  await auditService.log({
    organizationId,
    userId,
    action: 'organization.deactivated',
    resourceType: 'organization',
    resourceId: organizationId,
  });
  
  // TODO: Send notification emails to all members
  
  return organization;
}
```

### 3.2 Organization Routes

**File**: `server/src/routes/organizations.ts`

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import * as organizationService from '../services/organizationService';

export async function setupOrganizationRoutes(
  fastify: FastifyInstance
): Promise<void> {
  // Create organization
  fastify.post(
    '/api/organizations',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { name, slug, description } = request.body as any;
      
      const org = await organizationService.createOrganization(
        userId,
        name,
        slug,
        description
      );
      
      return org;
    }
  );
  
  // Get organization details
  fastify.get(
    '/api/organizations/:orgId',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest<{ Params: { orgId: string } }>, reply: FastifyReply) => {
      // Check membership
      // Return org details
    }
  );
  
  // Update organization
  fastify.put(
    '/api/organizations/:orgId',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('settings.organization.update', 'organization'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Update org
    }
  );
  
  // Deactivate organization
  fastify.delete(
    '/api/organizations/:orgId',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('settings.organization.delete', 'organization'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Deactivate
    }
  );
  
  // Get/Update settings
  fastify.get('/api/organizations/:orgId/settings', ...);
  fastify.put('/api/organizations/:orgId/settings', ...);
}
```

### 3.3 Organization Context Middleware

**File**: `server/src/middleware/organizationContext.ts`

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { getDatabaseClient } from '../database/DatabaseClient';

export async function requireOrganizationContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = (request.user as any).id;
  const orgId = (request.params as any).orgId || (request.query as any).orgId;
  
  if (!orgId) {
    reply.code(400).send({ error: 'Organization ID required' });
    return;
  }
  
  const db = getDatabaseClient();
  const membership = await db.organizationMembership.findFirst({
    where: {
      userId,
      organizationId: orgId,
      status: 'active',
    },
  });
  
  if (!membership) {
    reply.code(403).send({ error: 'Not a member of this organization' });
    return;
  }
  
  // Attach to request for use in handlers
  (request as any).organizationId = orgId;
  (request as any).membership = membership;
}
```

---

## Phase 4: User Management & Membership

### 4.1 Membership Service

**File**: `server/src/services/membershipService.ts`

**Key Functions**:
- `listMembers(organizationId, filters, pagination)`
- `getMemberDetails(organizationId, userId)`
- `changeMemberRole(organizationId, userId, newRoleId, changedBy)`
- `suspendMember(organizationId, userId, reason)`
- `reactivateMember(organizationId, userId)`
- `removeMember(organizationId, userId)`
- `bulkChangeRoles(organizationId, userIds, newRoleId)`
- `bulkSuspend(organizationId, userIds)`

**Implementation Notes**:
- Prevent removing last Super Admin
- Update `lastAccessAt` throttled (max every 5 minutes)
- All operations logged to audit
- Bulk operations use background jobs

### 4.2 User Service

**File**: `server/src/services/userService.ts`

**Key Functions**:
- `getUserProfile(userId)`
- `updateUserProfile(userId, updates)`
- `changePassword(userId, oldPassword, newPassword)` - Includes password history check
- `linkOAuthProvider(userId, provider, providerId)`
- `unlinkOAuthProvider(userId, provider)`
- `listUserOrganizations(userId)`
- `listUserSessions(userId)`
- `revokeUserSession(userId, sessionId)`
- `revokeAllOtherSessions(userId)`
- `deactivateUser(userId, deactivatedBy)`
- `reactivateUser(userId, reactivatedBy)`
- `deleteUser(userId)` - Hard delete after 90 days

**Password Change with History**:
```typescript
import { hashPassword, verifyPassword, validatePassword } from '../utils/passwordUtils';
import { getDatabaseClient } from '../database/DatabaseClient';

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const db = getDatabaseClient();
  
  // 1. Verify old password
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    throw new Error('User has no password set');
  }
  
  const valid = await verifyPassword(oldPassword, user.passwordHash);
  if (!valid) {
    throw new Error('Current password is incorrect');
  }
  
  // 2. Validate new password (strength, breach check, personal info)
  const validation = await validatePassword(newPassword, {
    email: user.email,
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
  });
  
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }
  
  // 3. Check password history (last 5)
  const history = await db.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  for (const old of history) {
    if (await verifyPassword(newPassword, old.passwordHash)) {
      throw new Error('Cannot reuse recent passwords. Please choose a different password.');
    }
  }
  
  // 4. Hash new password
  const passwordHash = await hashPassword(newPassword);
  
  // 5. Update user
  await db.user.update({
    where: { id: userId },
    data: { passwordHash }
  });
  
  // 6. Add to history
  await db.passwordHistory.create({
    data: { userId, passwordHash }
  });
  
  // 7. Keep only last 5
  const allHistory = await db.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  
  if (allHistory.length > 5) {
    const toDelete = allHistory.slice(5).map(h => h.id);
    await db.passwordHistory.deleteMany({
      where: { id: { in: toDelete } }
    });
  }
  
  // 8. Invalidate all sessions (force re-login)
  await invalidateAllUserSessions(userId);
}
```

---

## Phase 5: Invitation System

### 5.1 Invitation Service

**File**: `server/src/services/invitationService.ts`

**Key Functions**:
- `createInvitation(organizationId, email, roleId, invitedBy, message?)`
- `listInvitations(organizationId, filters)`
- `resendInvitation(invitationId, invitedBy)`
- `cancelInvitation(invitationId, cancelledBy)`
- `acceptInvitation(token, userEmail?)` - Works for existing and new users
- `bulkInvite(organizationId, invitations, invitedBy)` - CSV upload support

**Implementation Notes**:
- Single-use tokens (invalidated on acceptance)
- 7-day expiration (configurable)
- Auto-cancel previous pending invitations for same email/org
- Max 5 resends per invitation
- Email sent immediately via background job
- Track acceptance rate metrics

### 5.2 Invitation Routes

**File**: `server/src/routes/invitations.ts`

**Endpoints**:
- `POST /api/organizations/:orgId/invitations` - Create invitation
- `GET /api/organizations/:orgId/invitations` - List pending
- `POST /api/organizations/:orgId/invitations/:invitationId/resend` - Resend
- `DELETE /api/organizations/:orgId/invitations/:invitationId` - Cancel
- `POST /api/invitations/:token/accept` - Accept (public endpoint)
- `POST /api/organizations/:orgId/invitations/bulk` - Bulk invite (CSV)

---

## Phase 6: Role & Permission System

### 6.1 Permission Service

**File**: `server/src/services/permissionService.ts`

**Key Functions**:
- `listAllPermissions()` - Grouped by module
- `getPermissionByCode(code)`
- `checkPermission(userId, organizationId, permissionCode, resourceId?)` - Main permission checker
- `resolveWildcardPermissions(permissions)` - Resolve `projects.*` to all project permissions
- `getUserPermissions(userId, organizationId)` - Get all user's permissions
- `checkScope(permission, resource, userId, organizationId)` - Check own/team/org/all scope

**Permission Checking Logic**:
```typescript
import { getDatabaseClient } from '../database/DatabaseClient';
import { redis } from '../database/RedisClient';
import { cacheKeys } from '../utils/cacheKeys';

export async function checkPermission(
  userId: string,
  organizationId: string,
  permissionCode: string,
  resourceId?: string
): Promise<boolean> {
  const db = getDatabaseClient();
  
  // 1. Check if user is Super Admin (bypass)
  const membership = await db.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: 'active',
    },
    include: { role: true },
  });
  
  if (membership?.role.isSuperAdmin) {
    return true;
  }
  
  // 2. Get user permissions (cached)
  const userPermissions = await getUserPermissions(userId, organizationId);
  
  // 3. Check permission (with wildcard resolution)
  const hasPermission = matchesWildcard(userPermissions, permissionCode);
  
  if (hasPermission) {
    // 4. Check scope (own/team/org/all)
    return checkScope(permissionCode, resourceId, userId, organizationId);
  }
  
  // 5. Check resource-level permissions (union approach)
  if (resourceId) {
    const resourcePerm = await db.resourcePermission.findFirst({
      where: {
        userId,
        organizationId,
        resourceType: getResourceType(permissionCode),
        resourceId,
        expiresAt: { gt: new Date() }, // Not expired
      },
    });
    
    if (resourcePerm) {
      return true;
    }
  }
  
  return false;
}

// Wildcard permission matching (on-the-fly resolution)
function matchesWildcard(userPermissions: string[], required: string): boolean {
  // Check exact match first (fast path)
  if (userPermissions.includes(required)) return true;
  
  // Check wildcard matches
  // required: "projects.project.create"
  // user might have: "projects.*" or "projects.project.*"
  const requiredParts = required.split('.');
  
  for (const userPerm of userPermissions) {
    if (!userPerm.includes('*')) continue; // Skip non-wildcards
    
    const userParts = userPerm.split('.');
    let matches = true;
    
    for (let i = 0; i < userParts.length; i++) {
      if (userParts[i] === '*') continue; // Wildcard matches anything
      if (userParts[i] !== requiredParts[i]) {
        matches = false;
        break;
      }
    }
    
    if (matches) return true;
  }
  
  return false;
}

// Get user permissions (with caching)
async function getUserPermissions(
  userId: string,
  organizationId: string
): Promise<string[]> {
  const cacheKey = cacheKeys.userPermissions(userId, organizationId);
  
  // Check cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      return data.isSuperAdmin ? ['*'] : data.permissions;
    }
  } catch (redisError) {
    console.warn('Redis unavailable, falling back to DB', { error: redisError });
    // Fall through to DB query
  }
  
  // Fetch from DB
  const db = getDatabaseClient();
  const membership = await db.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: 'active',
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });
  
  if (!membership) {
    return [];
  }
  
  const permissions = {
    isSuperAdmin: membership.role.isSuperAdmin,
    permissions: membership.role.isSuperAdmin
      ? ['*'] // Wildcard = all permissions
      : membership.role.permissions.map(rp => rp.permission.code),
  };
  
  // Cache for 5 minutes
  try {
    await redis.setex(cacheKey, 300, JSON.stringify(permissions));
  } catch (cacheError) {
    console.warn('Failed to cache permissions', { error: cacheError });
  }
  
  return permissions.permissions;
}
```

### 6.2 Role Service

**File**: `server/src/services/roleService.ts`

**Key Functions**:
- `listRoles(organizationId)`
- `getRole(organizationId, roleId)`
- `createCustomRole(organizationId, name, description, permissionIds, createdBy)`
- `updateCustomRole(organizationId, roleId, updates, updatedBy)`
- `deleteCustomRole(organizationId, roleId, deletedBy)` - Prevent if users assigned
- `cloneRole(organizationId, roleId, newName, createdBy)`
- `getRolePermissions(organizationId, roleId)`
- `updateRolePermissions(organizationId, roleId, permissionIds, updatedBy)`
- `getUsersWithRole(organizationId, roleId)`

**Validation Rules**:
- Max 100 permissions per role
- Cannot create custom role with system role name
- Cannot modify/delete system roles
- Cannot delete role if users assigned (must reassign first)
- Archive role instead of delete (optional)

### 6.3 Seed System Roles & Permissions

**File**: `server/src/database/seed.ts` (update)

**Tasks**:
1. Create all system permissions (projects, tasks, teams, users, roles, settings, audit)
2. For each organization (or on org creation):
   - Create Super Admin role (isSuperAdmin=true)
   - Create Admin role (explicit permissions)
   - Create Member role
   - Create Viewer role
   - Assign permissions to each

**Permission Examples**:
```typescript
const permissions = [
  // Projects
  { code: 'projects.project.create', module: 'projects', resource: 'project', action: 'create', scope: null },
  { code: 'projects.project.read.own', module: 'projects', resource: 'project', action: 'read', scope: 'own' },
  { code: 'projects.project.read.all', module: 'projects', resource: 'project', action: 'read', scope: 'all' },
  { code: 'projects.project.update.own', module: 'projects', resource: 'project', action: 'update', scope: 'own' },
  { code: 'projects.project.update.all', module: 'projects', resource: 'project', action: 'update', scope: 'all' },
  { code: 'projects.project.delete', module: 'projects', resource: 'project', action: 'delete', scope: null },
  
  // Users
  { code: 'users.user.invite', module: 'users', resource: 'user', action: 'invite', scope: null },
  { code: 'users.user.read', module: 'users', resource: 'user', action: 'read', scope: null },
  { code: 'users.user.update', module: 'users', resource: 'user', action: 'update', scope: null },
  { code: 'users.user.manage', module: 'users', resource: 'user', action: 'manage', scope: null },
  
  // Roles
  { code: 'roles.role.create', module: 'roles', resource: 'role', action: 'create', scope: null },
  { code: 'roles.role.read', module: 'roles', resource: 'role', action: 'read', scope: null },
  { code: 'roles.role.update', module: 'roles', resource: 'role', action: 'update', scope: null },
  { code: 'roles.role.delete', module: 'roles', resource: 'role', action: 'delete', scope: null },
  
  // Settings
  { code: 'settings.organization.read', module: 'settings', resource: 'organization', action: 'read', scope: null },
  { code: 'settings.organization.update', module: 'settings', resource: 'organization', action: 'update', scope: null },
  
  // Audit
  { code: 'audit.logs.read', module: 'audit', resource: 'logs', action: 'read', scope: null },
];
```

---

## Phase 7: RBAC Middleware & Enforcement

### 7.1 Enhanced RBAC Middleware

**File**: `server/src/middleware/rbac.ts` (update existing)

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { getDatabaseClient } from '../database/DatabaseClient';
import { permissionService } from '../services/permissionService';
import { redis } from '../database/RedisClient';

export interface PermissionCheck {
  permission: string;
  resourceType?: 'project' | 'team' | 'user' | 'organization';
  resourceId?: string;
}

export async function checkPermission(
  request: FastifyRequest,
  reply: FastifyReply,
  check: PermissionCheck
): Promise<boolean> {
  if (!request.user) {
    reply.code(401).send({ error: 'Authentication required' });
    return false;
  }

  const userId = (request.user as any).id;
  const organizationId = (request as any).organizationId || check.resourceId;
  
  if (!organizationId) {
    reply.code(400).send({ error: 'Organization context required' });
    return false;
  }

  // Check permission (includes caching internally)
  const hasPermission = await permissionService.checkPermission(
    userId,
    organizationId,
    check.permission,
    check.resourceId
  );

  if (!hasPermission) {
    // Log denied permission check (only failures, not successes)
    await logPermissionDenial(userId, organizationId, check.permission);
    reply.code(403).send({ error: 'Insufficient permissions' });
    return false;
  }

  return true;
}

export function requirePermission(
  permission: string,
  resourceType?: 'project' | 'team' | 'user' | 'organization'
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const resourceId = params?.id || params?.projectId || params?.teamId || params?.orgId;
    
    const hasPermission = await checkPermission(request, reply, {
      permission,
      resourceType,
      resourceId,
    });

    if (!hasPermission) {
      return; // Error already sent
    }
  };
}

// Note: Wildcard matching moved to permissionService.matchesWildcard()
```

### 7.2 Permission Cache Invalidation

**File**: `server/src/services/cacheService.ts`

```typescript
import { redis } from '../database/RedisClient';

import { cacheKeys } from '../utils/cacheKeys';

export async function invalidateUserPermissions(
  userId: string,
  organizationId: string
): Promise<void> {
  try {
    await redis.del(cacheKeys.userPermissions(userId, organizationId));
  } catch (error) {
    console.warn('Failed to invalidate permissions cache', { error });
  }
}

export async function invalidateOrganizationCache(
  organizationId: string
): Promise<void> {
  // Invalidate all user permissions for this org
  // Note: Using SCAN instead of KEYS for better performance in production
  const stream = redis.scanStream({
    match: `*:perms:user:*:org:${organizationId}`,
    count: 100
  });
  
  const keys: string[] = [];
  stream.on('data', (resultKeys: string[]) => {
    keys.push(...resultKeys);
  });
  
  await new Promise((resolve) => {
    stream.on('end', resolve);
  });
  
  if (keys.length > 0) {
    // Delete in batches to avoid blocking
    const batchSize = 100;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await redis.del(...batch);
    }
  }
}

// Invalidate cache when role permissions change
export async function invalidateRolePermissions(roleId: string): Promise<void> {
  const db = getDatabaseClient();
  
  // Get all users with this role
  const memberships = await db.organizationMembership.findMany({
    where: { roleId },
    select: { userId: true, organizationId: true }
  });
  
  // Invalidate their permission caches
  await Promise.all(
    memberships.map(m => 
      invalidateUserPermissions(m.userId, m.organizationId)
    )
  );
  
  // Also invalidate role cache
  try {
    await redis.del(cacheKeys.rolePermissions(roleId));
  } catch (error) {
    console.warn('Failed to invalidate role cache', { error });
  }
}
```

---

## Phase 8: Audit Logging

### 8.1 Audit Service

**File**: `server/src/services/auditService.ts`

```typescript
import { getDatabaseClient } from '../database/DatabaseClient';
import { getDatabaseClient } from '../database/DatabaseClient';

interface AuditLogData {
  organizationId: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function log(data: AuditLogData): Promise<void> {
  const db = getDatabaseClient();
  
  // Get user's role for context
  let roleAtTime: string | null = null;
  let isSuperAdminAction = false;
  
  if (data.userId && data.organizationId) {
    const membership = await db.organizationMembership.findFirst({
      where: {
        userId: data.userId,
        organizationId: data.organizationId,
        status: 'active',
      },
      include: { role: true },
    });
    
    if (membership) {
      roleAtTime = membership.role.name;
      isSuperAdminAction = membership.role.isSuperAdmin;
    }
  }
  
  // Redact sensitive data
  const redactedChanges = redactSensitiveData(data.changes);
  
  await db.auditLog.create({
    data: {
      organizationId: data.organizationId,
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      changes: redactedChanges,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      isSuperAdminAction,
      roleAtTime,
    },
  });
}

function redactSensitiveData(changes?: Record<string, any>): Record<string, any> | null {
  if (!changes) return null;
  
  const redacted = { ...changes };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'apiKey', 'secret'];
  
  for (const field of sensitiveFields) {
    if (redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
    if (redacted.before?.[field]) {
      redacted.before[field] = '[REDACTED]';
    }
    if (redacted.after?.[field]) {
      redacted.after[field] = '[REDACTED]';
    }
  }
  
  return redacted;
}

export async function listAuditLogs(
  organizationId: string,
  filters: {
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
  },
  pagination: { cursor?: string; limit: number }
) {
  const db = getDatabaseClient();
  
  const where: any = {
    organizationId,
    ...(filters.userId && { userId: filters.userId }),
    ...(filters.action && { action: { contains: filters.action } }),
    ...(filters.resourceType && { resourceType: filters.resourceType }),
    ...(filters.startDate && filters.endDate && {
      createdAt: {
        gte: filters.startDate,
        lte: filters.endDate,
      },
    }),
  };
  
  if (pagination.cursor) {
    where.id = { gt: pagination.cursor };
  }
  
  return db.auditLog.findMany({
    where,
    take: pagination.limit + 1,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });
}
```

### 8.2 Audit Log Archival Job

**File**: `server/src/jobs/auditArchiveJob.ts`

```typescript
import { getDatabaseClient } from '../database/DatabaseClient';
import { S3 } from 'aws-sdk'; // or use AWS SDK v3
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const s3 = new S3();

export async function archiveOldAuditLogs(): Promise<void> {
  const db = getDatabaseClient();
  const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  // Get logs older than retention period
  const logs = await db.auditLog.findMany({
    where: {
      createdAt: { lt: cutoffDate },
      // Not already archived (add archived flag if needed)
    },
    take: 1000, // Process in batches
  });
  
  if (logs.length === 0) {
    return;
  }
  
  // Compress logs
  const jsonData = JSON.stringify(logs);
  const compressed = await gzipAsync(Buffer.from(jsonData));
  
  // Upload to S3
  const key = `audit-logs/${new Date().toISOString().split('T')[0]}/batch-${Date.now()}.json.gz`;
  await s3.putObject({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Body: compressed,
    ContentType: 'application/gzip',
  }).promise();
  
  // Delete from database (or mark as archived)
  await db.auditLog.deleteMany({
    where: {
      id: { in: logs.map(l => l.id) },
    },
  });
  
  console.log(`Archived ${logs.length} audit logs to ${key}`);
}
```

---

## Phase 9: Email System

### 9.1 Email Service

**File**: `server/src/services/emailService.ts`

```typescript
import sgMail from '@sendgrid/mail'; // or AWS SES SDK
import { renderTemplate } from '../templates/templateEngine';
import { getDatabaseClient } from '../database/DatabaseClient';
import { redis } from '../database/RedisClient';
import { cacheKeys } from '../utils/cacheKeys';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Rate limiting per organization
async function canSendEmail(organizationId: string): Promise<boolean> {
  const key = cacheKeys.emailRateLimit(organizationId);
  const limit = 1000; // emails per hour
  const window = 3600; // 1 hour in seconds
  
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, window);
  }
  
  return count <= limit;
}

export async function sendEmail(
  to: string,
  subject: string,
  template: string,
  data: Record<string, any>,
  organizationId?: string,
  userId?: string
): Promise<string> {
  // Check rate limit
  if (organizationId && !(await canSendEmail(organizationId))) {
    throw new Error('Organization email rate limit exceeded');
  }
  
  const html = await renderTemplate(`${template}.html`, data);
  const text = await renderTemplate(`${template}.text`, data);
  
  const msg = {
    to,
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    subject,
    html,
    text,
  };
  
  const result = await sgMail.send(msg);
  const messageId = result[0]?.headers['x-message-id'] || `msg-${Date.now()}`;
  
  // Log email delivery
  await logEmailDelivery({
    messageId,
    to,
    from: msg.from,
    subject,
    templateId: template,
    organizationId,
    userId,
    status: 'sent',
    provider: 'sendgrid',
    providerResponse: result[0],
  });
  
  return messageId;
}

async function logEmailDelivery(data: {
  messageId: string;
  to: string;
  from: string;
  subject: string;
  templateId?: string;
  organizationId?: string;
  userId?: string;
  status: string;
  provider: string;
  providerResponse?: any;
}): Promise<void> {
  const db = getDatabaseClient();
  
  await db.emailLog.create({
    data: {
      messageId: data.messageId,
      to: data.to,
      from: data.from,
      subject: data.subject,
      templateId: data.templateId,
      organizationId: data.organizationId,
      userId: data.userId,
      status: data.status as any,
      provider: data.provider,
      providerResponse: data.providerResponse,
      sentAt: new Date(),
    },
  });
}

export async function sendInvitationEmail(
  to: string,
  invitationToken: string,
  organizationName: string,
  inviterName: string,
  roleName: string,
  customMessage?: string
): Promise<void> {
  const acceptUrl = `${process.env.APP_URL}/invitations/accept?token=${invitationToken}`;
  
  await sendEmail(
    to,
    `You've been invited to ${organizationName}`,
    'invitation',
    {
      organizationName,
      inviterName,
      roleName,
      acceptUrl,
      customMessage,
      expiresIn: '7 days',
    }
  );
}
```

### 9.2 Email Templates

**Storage**: Filesystem-based (version controlled with code)

**File Structure**:
```
server/src/email-templates/
  /layouts/
    base.hbs
  /invitation.hbs
  /invitation.text.hbs
  /password-reset.hbs
  /password-reset.text.hbs
  /welcome.hbs
  /welcome.text.hbs
  /role-changed.hbs
  /role-changed.text.hbs
  /email-verification.hbs
  /email-verification.text.hbs
```

**File**: `server/src/templates/invitation.hbs`

```handlebars
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Email styles */
  </style>
</head>
<body>
  <h1>You've been invited!</h1>
  <p>Hi there,</p>
  <p>{{inviterName}} has invited you to join <strong>{{organizationName}}</strong> as a <strong>{{roleName}}</strong>.</p>
  {{#if customMessage}}
  <p><em>{{customMessage}}</em></p>
  {{/if}}
  <p><a href="{{acceptUrl}}">Accept Invitation</a></p>
  <p>This invitation expires in {{expiresIn}}.</p>
</body>
</html>
```

**Template Engine**:

**File**: `server/src/templates/templateEngine.ts`

```typescript
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

const templateCache = new Map<string, HandlebarsTemplateDelegate>();

export async function renderTemplate(
  templateName: string,
  data: Record<string, any>
): Promise<string> {
  // Check cache
  if (!templateCache.has(templateName)) {
    const templatePath = path.join(
      __dirname,
      '../email-templates',
      templateName
    );
    
    const source = fs.readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(source);
    templateCache.set(templateName, template);
  }
  
  const template = templateCache.get(templateName)!;
  return template(data);
}
```

**Email Webhook Handler** (for delivery tracking):

**File**: `server/src/routes/webhooks.ts`

```typescript
// SendGrid webhook handler
fastify.post('/webhooks/sendgrid', async (request, reply) => {
  const events = request.body; // Array of events
  
  const db = getDatabaseClient();
  
  for (const event of events) {
    await db.emailLog.update({
      where: { messageId: event.sg_message_id },
      data: {
        status: mapSendGridStatus(event.event),
        deliveredAt: event.event === 'delivered' ? new Date(event.timestamp * 1000) : undefined,
        openedAt: event.event === 'open' ? new Date(event.timestamp * 1000) : undefined,
        clickedAt: event.event === 'click' ? new Date(event.timestamp * 1000) : undefined,
        bouncedAt: event.event === 'bounce' ? new Date(event.timestamp * 1000) : undefined,
        errorMessage: event.reason,
        errorCode: event.status,
        providerResponse: event,
      },
    });
  }
  
  reply.status(200).send('OK');
});

function mapSendGridStatus(event: string): string {
  const mapping: Record<string, string> = {
    'processed': 'sent',
    'delivered': 'delivered',
    'open': 'opened',
    'click': 'clicked',
    'bounce': 'bounced',
    'dropped': 'failed',
  };
  return mapping[event] || 'sent';
}
```

### 9.3 Email Queue Processor

**File**: `server/src/jobs/emailProcessor.ts`

```typescript
import { emailQueue, criticalQueue } from '../queue/QueueManager';
import { emailService } from '../services/emailService';

// Invitation emails - High priority
emailQueue.process('send-invitation', async (job) => {
  const { to, token, organizationName, inviterName, roleName, message, organizationId, userId } = job.data;
  await emailService.sendInvitationEmail(
    to,
    token,
    organizationName,
    inviterName,
    roleName,
    message,
    organizationId,
    userId
  );
});

// Password reset - Critical priority
criticalQueue.process('send-password-reset', async (job) => {
  const { to, resetToken, userId } = job.data;
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
  
  await emailService.sendEmail(
    to,
    'Reset your password',
    'password-reset',
    { resetUrl, expiresIn: '1 hour' },
    undefined,
    userId
  );
});

// Welcome emails
emailQueue.process('send-welcome', async (job) => {
  const { to, userName, organizationName, userId } = job.data;
  await emailService.sendEmail(
    to,
    `Welcome to ${organizationName}!`,
    'welcome',
    { userName, organizationName },
    undefined,
    userId
  );
});

// Role changed notification
emailQueue.process('send-role-changed', async (job) => {
  const { to, userName, organizationName, oldRole, newRole, userId } = job.data;
  await emailService.sendEmail(
    to,
    `Your role in ${organizationName} has been updated`,
    'role-changed',
    { userName, organizationName, oldRole, newRole },
    undefined,
    userId
  );
});
```

---

## Phase 10: Security & Validation

### 10.1 Rate Limiting Middleware

**File**: `server/src/middleware/rateLimiting.ts`

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../database/RedisClient';

interface RateLimitConfig {
  window: number; // seconds
  max: number;
  keyGenerator: (request: FastifyRequest) => string;
}

export function rateLimit(config: RateLimitConfig) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = config.keyGenerator(request);
    const redisKey = `ratelimit:${key}`;
    
    const current = await redis.incr(redisKey);
    if (current === 1) {
      await redis.expire(redisKey, config.window);
    }
    
    if (current > config.max) {
      const ttl = await redis.ttl(redisKey);
      reply
        .code(429)
        .header('Retry-After', ttl.toString())
        .send({
          type: 'rate-limit-exceeded',
          title: 'Too Many Requests',
          status: 429,
          detail: `Rate limit exceeded. Try again in ${ttl} seconds.`,
          retry_after: ttl,
        });
      return;
    }
  };
}

// Usage examples
export const loginRateLimit = rateLimit({
  window: 15 * 60, // 15 minutes
  max: 5,
  keyGenerator: (req) => `login:${req.ip}`,
});

export const apiRateLimit = rateLimit({
  window: 60, // 1 minute
  max: 100,
  keyGenerator: (req) => `api:${(req.user as any)?.id || req.ip}`,
});
```

### 10.2 Input Validation

**File**: `server/src/utils/validation.ts` (enhance existing)

```typescript
import validator from 'validator';

export function validateEmail(email: string): boolean {
  return validator.isEmail(email);
}

export function validatePhoneNumber(phone: string): boolean {
  // E.164 format: +[country code][number]
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (slug.length < 3 || slug.length > 63) {
    return { valid: false, error: 'Slug must be 3-63 characters' };
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    return { valid: false, error: 'Slug must be lowercase alphanumeric with hyphens' };
  }
  if (slug.includes('--')) {
    return { valid: false, error: 'Slug cannot contain consecutive hyphens' };
  }
  return { valid: true };
}

export function sanitizeString(input: string, maxLength?: number): string {
  let sanitized = validator.escape(input);
  if (maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
}
```

### 10.3 CSRF Protection

**File**: `server/src/middleware/csrf.ts`

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import { redis } from '../database/RedisClient';

export async function generateCSRFToken(
  sessionId: string
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await redis.setex(`csrf:${sessionId}`, 8 * 60 * 60, token); // 8 hours
  return token;
}

export async function validateCSRFToken(
  sessionId: string,
  token: string
): Promise<boolean> {
  const stored = await redis.get(`csrf:${sessionId}`);
  return stored === token;
}
```

---

## Phase 11: Background Jobs

### 11.1 Job Processors

**Files**:
- `server/src/jobs/emailProcessor.ts` - Email sending
- `server/src/jobs/bulkOperationProcessor.ts` - Bulk user operations
- `server/src/jobs/auditArchiveProcessor.ts` - Audit log archival
- `server/src/jobs/cleanupProcessor.ts` - Soft delete cleanup

### 11.2 Scheduled Jobs

**File**: `server/src/jobs/scheduler.ts`

```typescript
import cron from 'node-cron';
import { auditArchiveQueue } from '../queue/QueueManager';
import { cleanupQueue } from '../queue/QueueManager';

// Daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  await auditArchiveQueue.add('archive-old-logs', {});
});

// Daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  await cleanupQueue.add('cleanup-soft-deletes', {});
});
```

---

## Phase 12: Frontend Components

### 12.1 Frontend State Management

**File**: `src/renderer/stores/authStore.ts`

```typescript
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  currentOrganization: Organization | null;
  organizations: Organization[];
  permissions: string[];
  
  setUser: (user: User) => void;
  setCurrentOrganization: (org: Organization) => void;
  setPermissions: (permissions: string[]) => void;
  switchOrganization: (orgId: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      currentOrganization: null,
      organizations: [],
      permissions: [],
      
      setUser: (user) => set({ user }),
      
      setCurrentOrganization: (org) => {
        set({ currentOrganization: org });
        // Fetch permissions for new org
        fetchPermissions(get().user!.id, org.id).then(perms => 
          set({ permissions: perms })
        );
      },
      
      setPermissions: (permissions) => set({ permissions }),
      
      switchOrganization: async (orgId: string) => {
        const org = get().organizations.find(o => o.id === orgId);
        if (!org) throw new Error('Organization not found');
        
        // Update backend session
        await api.post('/auth/switch-organization', { organizationId: orgId });
        
        // Update local state
        get().setCurrentOrganization(org);
      },
      
      logout: () => {
        set({ user: null, currentOrganization: null, organizations: [], permissions: [] });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        currentOrganization: state.currentOrganization,
        // Don't persist user/permissions (security)
      }),
    }
  )
);
```

**File**: `src/renderer/stores/permissionStore.ts`

```typescript
import { useAuthStore } from './authStore';
import { useCallback } from 'react';

export const usePermissions = () => {
  const permissions = useAuthStore(state => state.permissions);
  
  const hasPermission = useCallback((required: string) => {
    // Super admin check
    if (permissions.includes('*')) return true;
    
    // Exact match
    if (permissions.includes(required)) return true;
    
    // Wildcard match
    return permissions.some(perm => {
      if (!perm.includes('*')) return false;
      
      const regex = new RegExp('^' + perm.replace(/\*/g, '.*') + '$');
      return regex.test(required);
    });
  }, [permissions]);
  
  return { hasPermission, permissions };
};
```

### 12.2 Organization Switcher

**File**: `src/renderer/components/OrganizationSwitcher.tsx`

**Features**:
- Dropdown showing all user's organizations
- Display role in each org
- Quick switch functionality
- Recent/favorite orgs pinned
- Search/filter support
- Uses Zustand store for state

### 12.3 Permission Component

**File**: `src/renderer/components/RequirePermission.tsx`

```typescript
import { usePermissions } from '../stores/permissionStore';
import { ReactNode, isValidElement, cloneElement } from 'react';

interface Props {
  permission: string;
  fallback?: ReactNode;
  showDisabled?: boolean;
  children: ReactNode;
}

export function RequirePermission({ 
  permission, 
  fallback, 
  showDisabled, 
  children 
}: Props) {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(permission)) {
    if (showDisabled && isValidElement(children)) {
      return cloneElement(children, { disabled: true } as any);
    }
    return fallback || null;
  }
  
  return children;
}

// Usage
<RequirePermission permission="projects.project.delete">
  <button onClick={handleDelete}>Delete</button>
</RequirePermission>

<RequirePermission 
  permission="projects.project.edit"
  showDisabled
>
  <button onClick={handleEdit}>Edit</button>
</RequirePermission>
```

### 12.4 User Management View

**File**: `src/renderer/components/UserManagementView.tsx`

**Features**:
- Paginated user list (cursor-based)
- Filters: role, status, date joined
- Search by name/email
- Bulk actions toolbar
- User detail modal/page
- Export to CSV

### 12.5 Role Management View

**File**: `src/renderer/components/RoleManagementView.tsx`

**Features**:
- List all roles (system + custom)
- Permission picker (grouped by module)
- Create/edit custom role form
- Clone role functionality
- Users assigned to role view
- Permission matrix visualization

### 12.6 Invitation Management View

**File**: `src/renderer/components/InvitationManagementView.tsx`

**Features**:
- Invite form (email, role, message)
- Pending invitations table
- Resend/cancel actions
- Bulk invite (CSV upload)
- Invitation analytics

### 12.7 Audit Log Viewer

**File**: `src/renderer/components/AuditLogViewer.tsx`

**Features**:
- Timeline view with filters
- Search functionality
- Detail expansion
- Export (CSV, JSON)
- Real-time updates (optional)

---

## Phase 13: IPC Handlers

### 13.1 Organization Handlers

**File**: `src/main/ipc/organizationHandlers.ts`

**Handlers**:
- `organization:list`
- `organization:create`
- `organization:get`
- `organization:update`
- `organization:switch`
- `organization:settings:get`
- `organization:settings:update`

### 13.2 Membership Handlers

**File**: `src/main/ipc/membershipHandlers.ts`

**Handlers**:
- `membership:list`
- `membership:get`
- `membership:changeRole`
- `membership:suspend`
- `membership:reactivate`
- `membership:remove`
- `membership:bulkChangeRole`

---

## Phase 14: Testing

### 14.1 Unit Tests

**Framework**: Jest

**Files to Test**:
- `server/src/services/*.ts` - All services
- `server/src/utils/*.ts` - Utilities
- `server/src/middleware/*.ts` - Middleware

**Target**: 80% code coverage

**Test Data Factories**:

**File**: `server/src/__tests__/factories/userFactory.ts`

```typescript
import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const userFactory = {
  build: (overrides?: Partial<User>): Partial<User> => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJYz5K5u', // "password"
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),
  
  create: async (overrides?: Partial<User>): Promise<User> => {
    const user = userFactory.build(overrides);
    return await prisma.user.create({ data: user as any });
  },
  
  createMany: async (count: number, overrides?: Partial<User>): Promise<User[]> => {
    const users = Array.from({ length: count }, () => userFactory.build(overrides));
    await prisma.user.createMany({ data: users as any[] });
    return users as User[];
  }
};

// Similar factories for organizations, roles, memberships, etc.
```

**Test Setup with Transaction Rollback**:

**File**: `server/src/__tests__/setup.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeEach(async () => {
  // Start transaction
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  // Rollback transaction (cleanup)
  await prisma.$executeRaw`ROLLBACK`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

### 14.2 Integration Tests

**Test Database**: In-memory SQLite or Docker Postgres

**Test Flows**:
- Authentication flows
- Invitation flows
- User management flows
- Permission enforcement
- Organization management

**Mocking Strategy**:
- **Unit tests**: Mock external services (email, Redis, S3)
- **Integration tests**: Real implementations (database, Redis, S3)
- **E2E tests**: Everything real (production-like)

**File**: `server/src/__tests__/integration/auth.test.ts`

```typescript
// Mock email service for integration tests
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-123' })
}));

// Use real Redis (Docker container)
// Use real database (test database)

test('user can register and login', async () => {
  // Test full flow
});
```

### 14.3 E2E Tests

**Framework**: Playwright

**Test Database**: Separate E2E database (`DATABASE_URL_E2E`)

**Test Scenarios**:
- Signup → Create org → Invite user → Accept
- Admin workflows
- Permission enforcement in UI
- Organization switching

**E2E Test Setup**:

**File**: `e2e/setup.ts`

```typescript
import { test as base } from '@playwright/test';
import { resetDatabase, seedTestData } from './helpers/db';

export const test = base.extend({
  seedData: async ({}, use) => {
    // Reset database
    await resetDatabase();
    
    // Seed with fresh data
    const testData = await seedTestData();
    
    await use(testData);
    
    // Cleanup after test
    await resetDatabase();
  }
});
```

**File**: `playwright.config.ts`

```typescript
export default defineConfig({
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run dev:e2e',  // Uses E2E env vars
    port: 3000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL_E2E,
      NODE_ENV: 'test'
    }
  }
});
```

---

## Phase 15: Documentation

### 15.1 API Documentation

**File**: `server/src/docs/openapi.yaml`

**Format**: OpenAPI 3.0

**Tools**: Swagger UI or Redoc

### 15.2 User Documentation

**Files**: `documentation/user-guide/`

**Sections**:
- Getting started
- Admin guide
- Permission matrix
- FAQ

### 15.3 Developer Documentation

**Files**: `documentation/developer/`

**Sections**:
- Architecture overview
- Database schema
- Permission system
- Deployment guide

---

## Phase 16: Deployment & Monitoring

### 16.1 Environment Setup

- Production environment variables
- Database connection pooling
- Redis cluster setup
- S3 bucket for audit logs

### 16.2 Monitoring

**Structured Logging**:

**File**: `server/src/utils/logger.ts`

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-management' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      compress: true
    })
  ]
});

export default logger;
```

**Metrics Collection**:

**File**: `server/src/utils/metrics.ts`

```typescript
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

const registry = new Registry();

// Request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  registers: [registry]
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [registry]
});

// Business metrics
export const userLogins = new Counter({
  name: 'user_logins_total',
  help: 'Total user logins',
  labelNames: ['organization_id'],
  registers: [registry]
});

export const permissionChecks = new Counter({
  name: 'permission_checks_total',
  help: 'Total permission checks',
  labelNames: ['result'],  // allowed, denied
  registers: [registry]
});

// Expose metrics endpoint
export function setupMetricsEndpoint(app: FastifyInstance) {
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
}
```

**Error Tracking**:

**File**: `server/src/utils/sentry.ts`

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of transactions
  
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    // Filter out expected errors
    if (error?.message?.includes('ECONNRESET')) return null;
    if (event.exception?.values?.[0]?.value?.includes('JWT expired')) return null;
    
    // Redact PII
    if (event.request?.data) {
      event.request.data = redactPII(event.request.data);
    }
    
    return event;
  }
});

function redactPII(data: any): any {
  const sensitive = ['password', 'passwordHash', 'token', 'secret'];
  
  if (typeof data !== 'object') return data;
  
  const redacted = { ...data };
  for (const key of Object.keys(redacted)) {
    if (sensitive.includes(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactPII(redacted[key]);
    }
  }
  
  return redacted;
}
```

**Monitoring Tools**:
- **Prometheus + Grafana** (self-hosted, free) - Metrics
- **Sentry** - Error tracking
- **Winston** - Structured logging
- **Alerting**: Email + Slack for critical alerts

### 16.3 CI/CD Pipeline

**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      run_migrations:
        description: 'Run database migrations'
        required: false
        type: boolean

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:integration
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      
  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run migrate:deploy  # Auto-migrate staging
      - run: npm run deploy:staging
      
  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
    steps:
      - uses: actions/checkout@v3
      - name: Run migrations
        if: github.event.inputs.run_migrations == 'true'
        run: npm run migrate:deploy  # Manual trigger only
      - run: npm run deploy:production
```

**Migration Strategy**:
- **Dev**: `prisma migrate dev` - Creates + applies
- **Staging**: `prisma migrate deploy` - Auto-applies (test before prod)
- **Production**: `prisma migrate deploy` - Manual trigger only
- **Backup**: Automated backup before production migrations
- **Zero-downtime**: Use expand-contract pattern for breaking changes

---

## Additional Implementation Details

### Database Query Optimization

**N+1 Query Prevention**:
```typescript
// ❌ N+1 Query
const users = await prisma.user.findMany();
for (const user of users) {
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId: user.id }
  });
}

// ✅ Single query with join
const users = await prisma.user.findMany({
  include: {
    organizationMemberships: {
      include: {
        organization: true,
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    }
  }
});
```

**Slow Query Monitoring**:
```typescript
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 100) { // Slower than 100ms
    logger.warn('Slow query detected', {
      query: e.query,
      duration: e.duration,
      params: e.params
    });
  }
});
```

### API Response Optimization

**Compression**:
```typescript
import compression from 'compression';

app.use(compression({
  level: 6,
  threshold: 1024,  // Only compress if >1KB
}));
```

**ETag Support**:
```typescript
app.get('/api/organizations/:id', async (req, res) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.params.id }
  });
  
  const etag = `"${org.updatedAt.getTime()}"`;
  
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).send();  // Not Modified
  }
  
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.json(org);
});
```

### Frontend Performance

**Code Splitting**:
```typescript
import { lazy, Suspense } from 'react';

const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
```

**Virtual Scrolling** (for large lists):
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function UserList({ users }: { users: User[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5
  });
  
  // Render virtualized list
}
```

### JSON Field Queries

**Simple Queries** (Prisma):
```typescript
const orgs = await prisma.organization.findMany({
  where: {
    settings: {
      path: ['features', 'projects'],
      equals: true
    }
  }
});
```

**Complex Queries** (Raw SQL):
```typescript
const orgs = await prisma.$queryRaw`
  SELECT * FROM organizations 
  WHERE settings->>'theme'->>'primaryColor' = 'blue'
  AND deleted_at IS NULL
`;
```

## Additional Questions

See `ADMIN_ROLE_ADDITIONAL_QUESTIONS.md` for questions that may arise during implementation.

---

## Success Criteria

- ✅ Users can belong to multiple organizations
- ✅ Organization creator becomes Super Admin automatically
- ✅ Super Admin can create custom roles with configurable permissions
- ✅ Admin can manage all users in their organization
- ✅ Full CRUD operations for users
- ✅ Invitation system works for new and existing users
- ✅ Audit logging captures all Admin actions
- ✅ All permission checks respect organization context
- ✅ Organization switcher works seamlessly
- ✅ System roles cannot be modified/deleted
- ✅ Wildcard permissions work correctly
- ✅ Resource-level permissions supported
- ✅ Rate limiting prevents abuse
- ✅ Email system delivers invitations reliably
- ✅ Background jobs process async operations
- ✅ 80%+ test coverage
- ✅ Complete API documentation

---

**Estimated Timeline**: 8-12 weeks (depending on team size)

**Priority Order**:
1. Phases 1-3 (Foundation)
2. Phases 4-6 (Core Features)
3. Phases 7-9 (Security & Logging)
4. Phases 10-13 (Frontend & Integration)
5. Phases 14-16 (Testing & Deployment)
