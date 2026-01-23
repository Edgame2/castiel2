# Additional Implementation Questions - Answers
**Priority: Security & Flexibility**
**Date: January 16, 2026**

---

## Database & Schema

### 1. Prisma Migration Strategy
**Question:** Migration workflow for dev vs production?

**Answer:**
- ✅ **Dev:** `prisma migrate dev` - Creates migration + applies immediately
- ✅ **Production:** `prisma migrate deploy` - Only applies existing migrations, no new creation
- ✅ **Staging:** Same as production (test migration before prod)

**Migration Conflicts:**
- ✅ Use **linear migration history** - one developer creates migration at a time
- ✅ Pull latest before creating migration
- ✅ If conflict occurs: reset dev DB, pull latest, recreate migration
- ✅ Use feature branches with migration review before merging

**Data vs Schema Migrations:**
- ✅ **Combined approach** - Single migration file with schema + data changes
- ✅ Use Prisma's raw SQL for complex data migrations
- ✅ Comment data migration sections clearly
```typescript
-- CreateTable
CREATE TABLE "users" (...);

-- Data Migration: Populate default roles
INSERT INTO "roles" (id, name, ...) VALUES (...);
```

---

### 2. Database Indexes

**Composite Indexes:**
- ✅ **Yes, create for common queries:**

```prisma
model OrganizationMembership {
  // Single column indexes
  @@index([userId])
  @@index([organizationId])
  
  // Composite indexes for common queries
  @@index([organizationId, status, createdAt])  // List active members by creation
  @@index([userId, status])                      // User's active memberships
  @@index([organizationId, roleId])             // Members by role
  
  // Unique constraints
  @@unique([userId, organizationId])
}

model AuditLog {
  @@index([organizationId, createdAt])  // Org audit logs by date
  @@index([userId, createdAt])          // User activity by date
  @@index([action, createdAt])          // Specific action searches
  @@index([resourceType, resourceId])   // Resource-specific logs
}
```

**Index Maintenance:**
- ✅ Monitor query performance with database slow query log
- ✅ Use `EXPLAIN ANALYZE` to validate index usage
- ✅ Review indexes quarterly - remove unused ones
- ✅ Set up alerts for query times >1s

**Partial Indexes:**
- ✅ **Yes, for PostgreSQL:**
```sql
-- Only index active memberships (most queries filter on active)
CREATE INDEX idx_active_memberships 
ON organization_memberships (organization_id, user_id) 
WHERE status = 'active' AND deleted_at IS NULL;

-- Only index pending invitations
CREATE INDEX idx_pending_invitations 
ON invitations (organization_id, email) 
WHERE status = 'pending';
```

---

### 3. Soft Delete Implementation

**Query Filtering:**
- ✅ **Explicit filters preferred** - Prisma middleware can hide complexity but makes debugging harder
- ✅ **Use Prisma Client Extensions:**

```typescript
// Extend Prisma Client to auto-filter soft deletes
const prisma = new PrismaClient().$extends({
  model: {
    $allModels: {
      async findMany<T>(args: any) {
        return (this as any).findMany({
          ...args,
          where: {
            ...args?.where,
            deletedAt: null
          }
        })
      },
      // Similar for findFirst, findUnique, etc.
    }
  }
})

// Explicit method to include deleted
async findManyIncludingDeleted<T>(args: any) {
  return prisma.model.findMany(args) // No filter
}
```

**Foreign Key Constraints:**
- ✅ **Use SET NULL or NO ACTION:**
```prisma
model OrganizationMembership {
  role      Role    @relation(fields: [roleId], references: [id], onDelete: NoAction)
  roleId    String
}
```
- ✅ **Application-level cascading** - Check if parent is soft-deleted before operations
- ✅ **Validation:** Prevent operations on soft-deleted parent entities

**Database Views:**
- ✅ **No** - Adds complexity and Prisma doesn't support views well
- ✅ Instead: Use Prisma Client Extensions (shown above)
- ✅ Exception: If complex reporting queries need views, create them but don't use in main application

---

### 4. JSON Field Queries

**Query Strategy:**
- ✅ **Use Prisma's JSON filtering for simple queries:**

```typescript
// Simple equality
const orgs = await prisma.organization.findMany({
  where: {
    settings: {
      path: ['features', 'projects'],
      equals: true
    }
  }
})

// Contains
const orgs = await prisma.organization.findMany({
  where: {
    settings: {
      path: ['theme', 'primaryColor'],
      string_contains: 'blue'
    }
  }
})
```

**Complex Queries:**
- ✅ **Use raw SQL for complex JSON queries:**

```typescript
const orgs = await prisma.$queryRaw`
  SELECT * FROM organizations 
  WHERE settings->>'theme'->>'primaryColor' = 'blue'
  AND deleted_at IS NULL
`
```

**Computed Columns:**
- ✅ **No** - Denormalization adds complexity
- ✅ **Alternative:** Index JSON paths if using PostgreSQL:
```sql
CREATE INDEX idx_org_theme_color 
ON organizations ((settings->'theme'->>'primaryColor'));
```
- ✅ Only create if query performance requires it (measure first)

---

## Redis & Caching

### 5. Cache Key Naming

**Naming Convention:**
- ✅ **Use hierarchical, descriptive keys:**

```typescript
// Format: {domain}:{entity}:{identifier}:{attribute}
const cacheKeys = {
  userPermissions: (userId: string, orgId: string) => 
    `perms:user:${userId}:org:${orgId}`,
  
  userMemberships: (userId: string) => 
    `memberships:user:${userId}`,
  
  orgSettings: (orgId: string) => 
    `settings:org:${orgId}`,
  
  rolePermissions: (roleId: string) => 
    `perms:role:${roleId}`,
  
  sessionData: (sessionId: string) => 
    `session:${sessionId}`,
  
  rateLimitCounter: (endpoint: string, userId: string) => 
    `ratelimit:${endpoint}:user:${userId}`
}
```

**Versioning:**
- ✅ **Yes, include version in key:**
```typescript
const VERSION = 'v2'; // Update when schema changes

const cacheKeys = {
  userPermissions: (userId: string, orgId: string) => 
    `${VERSION}:perms:user:${userId}:org:${orgId}`
}
```
- ✅ Increment version on breaking changes
- ✅ Old cache entries expire naturally (TTL), no manual cleanup needed

**Collision Prevention:**
- ✅ Use UUIDs for identifiers (already unique)
- ✅ Include entity type in key (user:123 vs org:123)
- ✅ Test key generation with unit tests

---

### 6. Cache Warming

**Application Startup:**
- ✅ **No** - Don't pre-warm on startup
- ✅ **Reason:** Warms cache with data that may not be needed, delays startup
- ✅ **Alternative:** Lazy loading - cache populated on first request

**After Role/Permission Changes:**
- ✅ **Yes, invalidate affected caches:**

```typescript
async function updateRolePermissions(roleId: string, permissions: string[]) {
  // 1. Update database
  await prisma.rolePermission.deleteMany({ where: { roleId } })
  await prisma.rolePermission.createMany({ data: permissions })
  
  // 2. Invalidate all users with this role
  const memberships = await prisma.organizationMembership.findMany({
    where: { roleId },
    select: { userId: true, organizationId: true }
  })
  
  await Promise.all(
    memberships.map(m => 
      redis.del(cacheKeys.userPermissions(m.userId, m.organizationId))
    )
  )
  
  // 3. Invalidate role cache
  await redis.del(cacheKeys.rolePermissions(roleId))
  
  // Note: No pre-warming - cache populated on next request
}
```

**New Users:**
- ✅ **No pre-warming** - Cache populated on first permission check
- ✅ First request might be slightly slower (cache miss), acceptable tradeoff

---

### 7. Redis Cluster

**High Availability:**
- ✅ **Start with managed Redis (AWS ElastiCache, Redis Cloud)**
  - Built-in failover
  - Automatic backups
  - Multi-AZ deployment
  - Simpler operations

**Redis Cluster vs Sentinel:**
- ✅ **For <1000 concurrent users: Single Redis instance with managed service**
- ✅ **For >1000 users: Redis Sentinel** (simpler than Cluster)
  - Master-replica setup
  - Automatic failover
  - Sentinel monitors health
- ✅ **Only use Redis Cluster if:** 
  - Data exceeds single node memory (>100GB)
  - Need horizontal scaling (unlikely for this use case)

**Failover Handling:**
```typescript
// Graceful Redis failure
const redisClient = createClient({
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Redis connection failed')
      return Math.min(retries * 50, 2000) // Exponential backoff, max 2s
    }
  }
})

// Fallback to database if Redis unavailable
async function getUserPermissions(userId: string, orgId: string) {
  try {
    const cached = await redis.get(cacheKeys.userPermissions(userId, orgId))
    if (cached) return JSON.parse(cached)
  } catch (redisError) {
    logger.warn('Redis unavailable, falling back to DB', { error: redisError })
    // Fall through to DB query
  }
  
  // Fetch from database
  const permissions = await fetchPermissionsFromDB(userId, orgId)
  
  // Try to cache (may fail if Redis still down - that's OK)
  try {
    await redis.setex(
      cacheKeys.userPermissions(userId, orgId), 
      300, // 5 min TTL
      JSON.stringify(permissions)
    )
  } catch (cacheError) {
    logger.warn('Failed to cache permissions', { error: cacheError })
  }
  
  return permissions
}
```

---

## Background Jobs

### 8. Job Retry Strategy

**Retry Configuration:**
```typescript
import Queue from 'bull'

const emailQueue = new Queue('emails', {
  defaultJobOptions: {
    attempts: 3,              // Retry 3 times
    backoff: {
      type: 'exponential',    // Exponential backoff
      delay: 5000             // Start with 5 seconds
    },
    removeOnComplete: true,   // Clean up successful jobs
    removeOnFail: false       // Keep failed jobs for debugging
  }
})

// Job-specific retry strategy
const bulkOperationQueue = new Queue('bulk-operations', {
  defaultJobOptions: {
    attempts: 1,              // Don't retry bulk operations (too expensive)
    backoff: 'off'
  }
})
```

**Different Strategies per Job Type:**
- ✅ **Emails:** 3 retries, exponential backoff (5s, 25s, 125s)
- ✅ **Password resets:** 5 retries, linear backoff (30s, 60s, 90s, 120s, 150s)
- ✅ **Bulk operations:** 0 retries (manual re-trigger if needed)
- ✅ **Data exports:** 2 retries, fixed backoff (60s)
- ✅ **Audit log archival:** 3 retries, exponential backoff

**Failed Job Handling:**
```typescript
emailQueue.on('failed', async (job, err) => {
  logger.error('Job failed', {
    jobId: job.id,
    jobType: job.name,
    attempts: job.attemptsMade,
    error: err
  })
  
  // Alert if critical job failed
  if (job.name === 'password-reset' && job.attemptsMade >= 5) {
    await alertOps('Password reset email failed after all retries', { job })
  }
})
```

---

### 9. Job Priorities

**Priority Levels:**
```typescript
enum JobPriority {
  CRITICAL = 1,    // Password resets, security alerts
  HIGH = 5,        // Invitations, user notifications
  NORMAL = 10,     // General emails, data processing
  LOW = 20         // Bulk operations, reports, cleanup tasks
}

// Add jobs with priority
await emailQueue.add('password-reset', data, { priority: JobPriority.CRITICAL })
await emailQueue.add('invitation', data, { priority: JobPriority.HIGH })
await emailQueue.add('bulk-invite', data, { priority: JobPriority.LOW })
```

**Queue Congestion:**
- ✅ **Monitor queue length:** Alert if >1000 pending jobs
- ✅ **Rate limiting:** Limit bulk operations to 1 per hour per org
- ✅ **Separate queues for critical vs bulk:**

```typescript
const criticalQueue = new Queue('critical', { limiter: { max: 100, duration: 1000 } })
const bulkQueue = new Queue('bulk', { limiter: { max: 10, duration: 1000 } })
```

**Multiple Queues:**
- ✅ **Yes, separate queues by type:**
  - `critical-queue`: Password resets, security
  - `email-queue`: All emails
  - `bulk-queue`: Bulk operations
  - `maintenance-queue`: Cleanup, archival

---

### 10. Job Monitoring

**Queue Metrics:**
```typescript
import { Queue } from 'bull'
import { Registry, Gauge, Counter } from 'prom-client'

const registry = new Registry()

// Metrics
const queueLength = new Gauge({
  name: 'job_queue_length',
  help: 'Number of jobs in queue',
  labelNames: ['queue', 'state'],
  registers: [registry]
})

const jobDuration = new Gauge({
  name: 'job_processing_duration_seconds',
  help: 'Time to process job',
  labelNames: ['queue', 'job_type'],
  registers: [registry]
})

const jobFailures = new Counter({
  name: 'job_failures_total',
  help: 'Total failed jobs',
  labelNames: ['queue', 'job_type'],
  registers: [registry]
})

// Update metrics periodically
setInterval(async () => {
  const counts = await emailQueue.getJobCounts()
  queueLength.set({ queue: 'email', state: 'waiting' }, counts.waiting)
  queueLength.set({ queue: 'email', state: 'active' }, counts.active)
  queueLength.set({ queue: 'email', state: 'failed' }, counts.failed)
}, 10000) // Every 10 seconds
```

**Alerting:**
- ✅ **Alert if:**
  - Queue length >1000 for >5 minutes
  - Job failure rate >5% over 1 hour
  - Any job stuck in 'active' state for >30 minutes
  - Critical job fails after all retries

**Stuck Jobs:**
```typescript
// Check for stuck jobs every 5 minutes
setInterval(async () => {
  const activeJobs = await emailQueue.getActive()
  const now = Date.now()
  
  for (const job of activeJobs) {
    const processingTime = now - job.processedOn
    if (processingTime > 30 * 60 * 1000) { // 30 minutes
      logger.error('Stuck job detected', { jobId: job.id, processingTime })
      await job.moveToFailed(new Error('Job timeout - stuck for >30min'))
    }
  }
}, 5 * 60 * 1000)
```

---

## Email System

### 11. Email Delivery Tracking

**Track Delivery Status:**
- ✅ **Yes, create email_logs table:**

```prisma
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
```

**Webhook Integration:**
```typescript
// SendGrid webhook handler
app.post('/webhooks/sendgrid', async (req, res) => {
  const events = req.body // Array of events
  
  for (const event of events) {
    await prisma.emailLog.update({
      where: { messageId: event.sg_message_id },
      data: {
        status: mapSendGridStatus(event.event),
        deliveredAt: event.event === 'delivered' ? new Date(event.timestamp * 1000) : undefined,
        openedAt: event.event === 'open' ? new Date(event.timestamp * 1000) : undefined,
        bouncedAt: event.event === 'bounce' ? new Date(event.timestamp * 1000) : undefined,
        errorMessage: event.reason,
        errorCode: event.status,
        providerResponse: event
      }
    })
  }
  
  res.status(200).send('OK')
})
```

**Bounce Handling:**
- ✅ **Hard bounces:** Mark email as invalid, flag user account
- ✅ **Soft bounces:** Retry up to 3 times over 24 hours
- ✅ **Spam complaints:** Stop sending to that email, alert admins

**Failed Delivery Retry:**
- ✅ **Yes, via job retry mechanism** (covered in Job Retry section)
- ✅ Don't retry: Invalid email, hard bounces, spam complaints
- ✅ Do retry: Temporary failures, rate limits, network errors

---

### 12. Email Templates

**Storage Location:**
- ✅ **Filesystem for default templates:**

```
/src/email-templates/
  /layouts/
    base.hbs
  /invitation.hbs
  /password-reset.hbs
  /welcome.hbs
  /role-changed.hbs
```

**Reasoning:**
- Version controlled with code
- Easy to review in PRs
- Type-safe compilation
- Can be overridden per-org in database later

**Template Versioning:**
- ✅ **Git versioning** - Templates versioned with code
- ✅ **Breaking changes:** Create new template file, deprecate old
```
invitation-v1.hbs
invitation-v2.hbs  // New format
```
- ✅ **Migration:** Gradually roll out new version via feature flag

**Per-Organization Templates (Future):**
```prisma
model EmailTemplate {
  id              String   @id @default(uuid())
  organizationId  String
  templateType    String   // invitation, password-reset, etc.
  subject         String
  htmlBody        String   @db.Text
  textBody        String   @db.Text
  variables       Json     // List of available variables
  isActive        Boolean  @default(false)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([organizationId, templateType])
}
```

**A/B Testing:**
- ✅ **Not initially** - Add later if needed
- ✅ **Implementation when needed:**
  - Create variant templates
  - Randomly assign variant to user
  - Track open/click rates per variant
  - Statistical significance testing

---

### 13. Email Rate Limiting

**Rate Limiting Strategy:**
- ✅ **Per-organization limits:**

```typescript
// Redis-based rate limiter
async function canSendEmail(organizationId: string): Promise<boolean> {
  const key = `email-ratelimit:org:${organizationId}`
  const limit = 1000 // emails per hour
  const window = 3600 // 1 hour in seconds
  
  const count = await redis.incr(key)
  
  if (count === 1) {
    await redis.expire(key, window)
  }
  
  return count <= limit
}

// Before queuing email
if (!await canSendEmail(organizationId)) {
  throw new Error('Organization email rate limit exceeded')
}
```

**Provider Rate Limits:**
- ✅ **SendGrid:** 100 emails/second, handle with queue rate limiting
```typescript
const emailQueue = new Queue('emails', {
  limiter: {
    max: 50,      // Max 50 jobs
    duration: 1000 // Per second
  }
})
```

- ✅ **AWS SES:** Depends on account (start: 1 email/sec), use exponential backoff on throttle errors

**High-Volume Periods:**
- ✅ **Yes, queue and stagger:**

```typescript
async function sendBulkInvitations(emails: string[]) {
  const batchSize = 100
  const delayBetweenBatches = 60000 // 1 minute
  
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    
    for (const email of batch) {
      await emailQueue.add('invitation', { email }, {
        delay: (i / batchSize) * delayBetweenBatches
      })
    }
  }
}
```

---

## Permission System

### 14. Permission Caching

**Cache Invalidation:**
```typescript
async function updateUserRole(
  userId: string, 
  organizationId: string, 
  newRoleId: string
) {
  // 1. Update database
  await prisma.organizationMembership.update({
    where: { userId_organizationId: { userId, organizationId } },
    data: { roleId: newRoleId }
  })
  
  // 2. Invalidate permission cache
  const cacheKey = cacheKeys.userPermissions(userId, organizationId)
  await redis.del(cacheKey)
  
  // 3. Invalidate all active sessions for this user in this org
  // Force re-fetch of permissions on next request
  const sessionPattern = `session:*:user:${userId}:org:${organizationId}`
  const sessionKeys = await redis.keys(sessionPattern)
  if (sessionKeys.length > 0) {
    await redis.del(...sessionKeys)
  }
  
  // 4. Log the change
  await createAuditLog({
    action: 'user.role.changed',
    userId,
    organizationId,
    changes: { oldRoleId: '...', newRoleId }
  })
}
```

**Request-Level Caching:**
- ✅ **Yes, cache permission checks within a single request:**

```typescript
// Request-scoped cache (in-memory, lifetime = one request)
class RequestContext {
  private permissionCache = new Map<string, boolean>()
  
  async checkPermission(
    userId: string, 
    orgId: string, 
    permission: string
  ): Promise<boolean> {
    const cacheKey = `${userId}:${orgId}:${permission}`
    
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!
    }
    
    const hasPermission = await checkPermissionFromRedisOrDB(userId, orgId, permission)
    this.permissionCache.set(cacheKey, hasPermission)
    return hasPermission
  }
}

// Middleware: Create new context per request
app.use((req, res, next) => {
  req.context = new RequestContext()
  next()
})
```

**Super Admin Caching:**
- ✅ **Still cache, but with flag:**

```typescript
async function getUserPermissions(userId: string, orgId: string) {
  const cacheKey = cacheKeys.userPermissions(userId, orgId)
  
  // Check cache
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)
  
  // Fetch from DB
  const membership = await prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    include: { role: { include: { permissions: true } } }
  })
  
  const permissions = {
    isSuperAdmin: membership.role.isSuperAdmin,
    permissions: membership.role.isSuperAdmin 
      ? ['*'] // Wildcard = all permissions
      : membership.role.permissions.map(p => p.permissionCode)
  }
  
  await redis.setex(cacheKey, 300, JSON.stringify(permissions))
  return permissions
}

// Permission check
async function hasPermission(userId: string, orgId: string, required: string) {
  const userPerms = await getUserPermissions(userId, orgId)
  
  // Super Admin bypass
  if (userPerms.isSuperAdmin) return true
  
  // Regular permission check
  return userPerms.permissions.includes(required) || 
         matchesWildcard(userPerms.permissions, required)
}
```

---

### 15. Wildcard Permission Resolution

**Resolution Strategy:**
- ✅ **Resolve on-the-fly** (don't pre-compute)

**Reasoning:**
- Wildcards are checked per request anyway
- Pre-computing explodes permission count
- On-the-fly resolution is fast (O(n) where n = permissions user has, typically <50)

**Implementation:**
```typescript
function matchesWildcard(userPermissions: string[], required: string): boolean {
  // Check exact match first (fast path)
  if (userPermissions.includes(required)) return true
  
  // Check wildcard matches
  // required: "projects.project.create"
  // user might have: "projects.*" or "projects.project.*"
  
  const requiredParts = required.split('.')
  
  for (const userPerm of userPermissions) {
    if (!userPerm.includes('*')) continue // Skip non-wildcards
    
    const userParts = userPerm.split('.')
    let matches = true
    
    for (let i = 0; i < userParts.length; i++) {
      if (userParts[i] === '*') continue // Wildcard matches anything
      if (userParts[i] !== requiredParts[i]) {
        matches = false
        break
      }
    }
    
    if (matches) return true
  }
  
  return false
}

// Examples:
matchesWildcard(['projects.*'], 'projects.project.create') // true
matchesWildcard(['projects.project.*'], 'projects.project.create') // true
matchesWildcard(['projects.task.*'], 'projects.project.create') // false
matchesWildcard(['*'], 'anything.goes.here') // true
```

**Nested Wildcards:**
- ✅ **Support limited nesting:**
  - `projects.*` ✅ (one level)
  - `projects.project.*` ✅ (two levels)
  - `*.*.*` ❌ (too broad, not allowed)
- ✅ **Validate wildcards when creating roles:**

```typescript
function isValidPermission(permission: string): boolean {
  // Must be exact permission code or end with .*
  if (!permission.includes('*')) {
    return VALID_PERMISSIONS.includes(permission)
  }
  
  // Wildcard must be last segment
  if (!permission.endsWith('.*')) return false
  
  // Must have at least one specific segment
  const parts = permission.split('.')
  if (parts.length < 2) return false // Reject just "*"
  
  return true
}
```

**Caching Resolved Wildcards:**
- ✅ **No separate cache** - User permissions already cached (includes wildcards)
- ✅ Resolution is fast enough (<1ms for typical permission sets)

---

### 16. Resource-Level Permissions

**Override vs Union:**
- ✅ **Union approach** - Grant access if EITHER role permission OR resource permission allows

```typescript
async function canAccessResource(
  userId: string,
  orgId: string,
  permission: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  // 1. Check role-based permission
  const hasRolePermission = await hasPermission(userId, orgId, permission)
  if (hasRolePermission) return true
  
  // 2. Check resource-level permission
  const resourcePerm = await prisma.resourcePermission.findFirst({
    where: {
      userId,
      organizationId: orgId,
      resourceType,
      resourceId,
      permissionLevel: { in: getApplicableLevels(permission) }
    }
  })
  
  return !!resourcePerm
}

function getApplicableLevels(permission: string): string[] {
  // Map permission to resource permission levels
  if (permission.includes('.delete')) return ['owner', 'admin']
  if (permission.includes('.update')) return ['owner', 'admin', 'editor']
  if (permission.includes('.read')) return ['owner', 'admin', 'editor', 'viewer']
  return []
}
```

**Permission Expiration:**
```typescript
// Cron job: Expire resource permissions
cron.schedule('0 * * * *', async () => { // Every hour
  const now = new Date()
  
  const expired = await prisma.resourcePermission.deleteMany({
    where: {
      expiresAt: { lte: now }
    }
  })
  
  logger.info('Expired resource permissions', { count: expired.count })
  
  // TODO: Invalidate caches for affected users
})
```

**Permission Inheritance:**
- ✅ **Yes, for parent-child resources:**

```typescript
async function canAccessTask(
  userId: string,
  orgId: string,
  taskId: string,
  permission: string
): Promise<boolean> {
  // 1. Check task-level permission
  const hasTaskPerm = await canAccessResource(userId, orgId, permission, 'task', taskId)
  if (hasTaskPerm) return true
  
  // 2. Check parent project permission
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true }
  })
  
  if (!task) return false
  
  const hasProjectPerm = await canAccessResource(
    userId, 
    orgId, 
    permission.replace('tasks.', 'projects.'), // Map task perm to project perm
    'project', 
    task.projectId
  )
  
  return hasProjectPerm
}
```

---

## Security

### 17. JWT Token Rotation

**Secret Rotation:**
- ✅ **Yes, rotate every 90 days**

**Multi-Secret Support:**
```typescript
// Store multiple secrets with IDs
const JWT_SECRETS = [
  { id: '2026-01', secret: process.env.JWT_SECRET_CURRENT, isActive: true },
  { id: '2025-10', secret: process.env.JWT_SECRET_OLD, isActive: false }
]

// Sign with current secret
function signToken(payload: any): string {
  const currentSecret = JWT_SECRETS.find(s => s.isActive)
  return jwt.sign(
    { ...payload, secretId: currentSecret.id },
    currentSecret.secret,
    { expiresIn: '8h' }
  )
}

// Verify with any valid secret
function verifyToken(token: string): any {
  const decoded = jwt.decode(token, { complete: true })
  const secretId = decoded.payload.secretId
  
  const secret = JWT_SECRETS.find(s => s.id === secretId)
  if (!secret) throw new Error('Invalid token secret')
  
  return jwt.verify(token, secret.secret)
}
```

**Rotation Process:**
1. Add new secret to environment (don't remove old)
2. Deploy with both secrets supported
3. New tokens signed with new secret
4. Old tokens still valid (verified with old secret)
5. After 8 hours (token expiration), remove old secret
6. Deploy removal

**No Session Invalidation:**
- ✅ Users stay logged in during rotation
- ✅ New tokens use new secret automatically

---

### 18. Session Security

**Device Fingerprinting:**
- ✅ **Yes, lightweight fingerprinting:**

```typescript
import crypto from 'crypto'

function generateFingerprint(req: Request): string {
  const components = [
    req.headers['user-agent'],
    req.headers['accept-language'],
    req.headers['accept-encoding'],
    // Don't include IP (changes frequently)
  ]
  
  const fingerprint = components.join('|')
  return crypto.createHash('sha256').update(fingerprint).digest('hex')
}

// Store in session
const session = {
  userId,
  organizationId,
  fingerprint: generateFingerprint(req),
  // ...
}

// Validate on requests
function validateSession(req: Request, session: Session): boolean {
  const currentFingerprint = generateFingerprint(req)
  
  // Allow session if fingerprint matches or is similar
  // (Browser updates can change user-agent slightly)
  return session.fingerprint === currentFingerprint
}
```

**Session Hijacking Detection:**
```typescript
async function detectHijacking(req: Request, session: Session): Promise<boolean> {
  const suspicious = []
  
  // Check fingerprint change
  if (session.fingerprint !== generateFingerprint(req)) {
    suspicious.push('fingerprint_mismatch')
  }
  
  // Check IP geolocation change (major)
  const sessionGeo = await getGeolocation(session.ipAddress)
  const currentGeo = await getGeolocation(req.ip)
  
  if (sessionGeo.country !== currentGeo.country) {
    suspicious.push('country_changed')
  }
  
  // Check impossible travel (new location <1 hour after old, >500km apart)
  const timeDiff = Date.now() - session.lastActivityAt.getTime()
  const distance = calculateDistance(sessionGeo, currentGeo)
  
  if (timeDiff < 3600000 && distance > 500) { // < 1 hour, >500km
    suspicious.push('impossible_travel')
  }
  
  if (suspicious.length > 0) {
    logger.warn('Suspicious session activity', { 
      sessionId: session.id, 
      userId: session.userId,
      suspicious 
    })
    
    // High confidence hijacking: force re-auth
    if (suspicious.includes('impossible_travel')) {
      await invalidateSession(session.id)
      return true
    }
    
    // Medium confidence: log but allow (may be VPN, proxy, etc.)
    // Can require 2FA challenge here later
  }
  
  return false
}
```

**Re-Authentication for Sensitive Operations:**
- ✅ **Yes, require password confirmation:**

```typescript
const SENSITIVE_OPERATIONS = [
  'change_password',
  'delete_account',
  'transfer_ownership',
  'delete_organization',
  'change_email'
]

async function requireRecentAuth(req: Request, maxAge: number = 300000) { // 5 min
  const session = req.session
  
  if (!session.lastPasswordConfirmAt) {
    throw new Error('Password confirmation required')
  }
  
  const timeSinceConfirm = Date.now() - session.lastPasswordConfirmAt.getTime()
  
  if (timeSinceConfirm > maxAge) {
    throw new Error('Please confirm your password to continue')
  }
}

// Usage
app.delete('/api/account', async (req, res) => {
  await requireRecentAuth(req) // Throws if not recently authenticated
  
  // Proceed with account deletion
  await deleteAccount(req.user.id)
  res.status(200).send()
})

// Password confirmation endpoint
app.post('/api/auth/confirm-password', async (req, res) => {
  const { password } = req.body
  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid password' })
  }
  
  req.session.lastPasswordConfirmAt = new Date()
  res.status(200).send()
})
```

---

### 19. Password Security

**Password History:**
- ✅ **Yes, prevent reuse of last 5 passwords:**

```prisma
model PasswordHistory {
  id           String   @id @default(uuid())
  userId       String
  passwordHash String
  createdAt    DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt])
}
```

```typescript
async function changePassword(userId: string, newPassword: string) {
  // 1. Check password history
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  
  for (const old of history) {
    if (await bcrypt.compare(newPassword, old.passwordHash)) {
      throw new Error('Cannot reuse recent passwords. Please choose a different password.')
    }
  }
  
  // 2. Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12)
  
  // 3. Update user
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  })
  
  // 4. Add to history
  await prisma.passwordHistory.create({
    data: { userId, passwordHash }
  })
  
  // 5. Keep only last 5
  const allHistory = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })
  
  if (allHistory.length > 5) {
    const toDelete = allHistory.slice(5).map(h => h.id)
    await prisma.passwordHistory.deleteMany({
      where: { id: { in: toDelete } }
    })
  }
  
  // 6. Invalidate all sessions (force re-login)
  await invalidateAllUserSessions(userId)
}
```

**Password Expiration:**
- ✅ **No** - Research shows forced password rotation reduces security (users create predictable patterns)
- ✅ **Alternative:** Encourage password change if:
  - Account created >2 years ago and never changed password
  - Detected in breach database (HaveIBeenPwned)
  - Suspicious activity detected

**Password Complexity:**
- ✅ **Minimum 8 characters, no other requirements**
- ✅ **Rationale:** NIST guidelines recommend length over complexity
- ✅ **Additional checks:**
  - Check against HaveIBeenPwned (breach database)
  - Reject common passwords (password, 12345678, qwerty, etc.)
  - Reject password that matches email/name

```typescript
import { pwnedPassword } from 'hibp'

async function validatePassword(password: string, user: Partial<User>): Promise<void> {
  // Length check
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }
  
  // Common password check
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', ...]
  if (commonPasswords.includes(password.toLowerCase())) {
    throw new Error('This password is too common. Please choose a stronger password.')
  }
  
  // Personal info check
  if (user.email && password.toLowerCase().includes(user.email.split('@')[0].toLowerCase())) {
    throw new Error('Password should not contain your email')
  }
  
  if (user.firstName && password.toLowerCase().includes(user.firstName.toLowerCase())) {
    throw new Error('Password should not contain your name')
  }
  
  // Breach check (HaveIBeenPwned API)
  const breachCount = await pwnedPassword(password)
  if (breachCount > 0) {
    throw new Error(
      `This password has been exposed in ${breachCount} data breaches. ` +
      `Please choose a different password.`
    )
  }
}
```

---

### 20. API Security

**API Key Authentication:**
- ✅ **Not initially** - JWT sufficient
- ✅ **Add when needed for integrations:**

```prisma
model ApiKey {
  id             String   @id @default(uuid())
  userId         String
  organizationId String
  name           String   // User-provided name "CI/CD Pipeline"
  keyHash        String   @unique
  prefix         String   // First 8 chars, shown to user
  lastUsedAt     DateTime?
  expiresAt      DateTime?
  scopes         String[]  // Limited permissions
  isActive       Boolean  @default(true)
  
  createdAt      DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([keyHash])
  @@index([userId])
}
```

**CORS Configuration:**
```typescript
import cors from 'cors'

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://app.example.com',
      'https://staging.example.com'
    ]
    
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}

app.use(cors(corsOptions))
```

**Request Signing:**
- ✅ **No** - HTTPS + CSRF protection sufficient for web app
- ✅ **Consider for webhooks** (verify webhook payload came from us):

```typescript
function signWebhookPayload(payload: any, secret: string): string {
  const timestamp = Date.now()
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex')
  
  return `t=${timestamp},v1=${signature}`
}

// Client verifies signature
function verifyWebhookSignature(
  payload: any, 
  signatureHeader: string, 
  secret: string
): boolean {
  const [t, signature] = signatureHeader.split(',')
  const timestamp = parseInt(t.split('=')[1])
  const expectedSig = signature.split('=')[1]
  
  // Reject if timestamp >5 minutes old (replay attack)
  if (Date.now() - timestamp > 300000) return false
  
  const computedSig = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSig),
    Buffer.from(computedSig)
  )
}
```

---

## Frontend

### 21. State Management

**Global State Choice:**
- ✅ **Zustand** - Modern, simple, TypeScript-friendly

**Reasoning:**
- Redux: Too verbose, overkill for this use case
- React Context: Performance issues with frequent updates
- Zustand: Perfect balance - simple, performant, TypeScript support

**Implementation:**
```typescript
// stores/authStore.ts
import create from 'zustand'

interface AuthState {
  user: User | null
  currentOrganization: Organization | null
  organizations: Organization[]
  permissions: string[]
  
  setUser: (user: User) => void
  setCurrentOrganization: (org: Organization) => void
  setPermissions: (permissions: string[]) => void
  switchOrganization: (orgId: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  currentOrganization: null,
  organizations: [],
  permissions: [],
  
  setUser: (user) => set({ user }),
  
  setCurrentOrganization: (org) => {
    set({ currentOrganization: org })
    // Fetch permissions for new org
    fetchPermissions(get().user!.id, org.id).then(perms => 
      set({ permissions: perms })
    )
  },
  
  setPermissions: (permissions) => set({ permissions }),
  
  switchOrganization: async (orgId) => {
    const org = get().organizations.find(o => o.id === orgId)
    if (!org) throw new Error('Organization not found')
    
    // Update backend session
    await api.post('/auth/switch-organization', { organizationId: orgId })
    
    // Update local state
    get().setCurrentOrganization(org)
  },
  
  logout: () => {
    set({ user: null, currentOrganization: null, organizations: [], permissions: [] })
  }
}))
```

**Organization Context:**
- ✅ Store in global state (Zustand)
- ✅ Persist to localStorage for page reloads
- ✅ Validate on mount (ensure user still has access)

**Permission Caching:**
- ✅ **Yes, cache in frontend state:**
```typescript
// stores/permissionStore.ts
export const usePermissions = () => {
  const permissions = useAuthStore(state => state.permissions)
  
  const hasPermission = useCallback((required: string) => {
    // Super admin check
    if (permissions.includes('*')) return true
    
    // Exact match
    if (permissions.includes(required)) return true
    
    // Wildcard match
    return permissions.some(perm => {
      if (!perm.includes('*')) return false
      
      const regex = new RegExp('^' + perm.replace('*', '.*') + '$')
      return regex.test(required)
    })
  }, [permissions])
  
  return { hasPermission, permissions }
}

// Usage in component
function ProjectActions({ project }) {
  const { hasPermission } = usePermissions()
  
  return (
    <div>
      {hasPermission('projects.project.update') && (
        <button onClick={handleEdit}>Edit</button>
      )}
      {hasPermission('projects.project.delete') && (
        <button onClick={handleDelete}>Delete</button>
      )}
    </div>
  )
}
```

---

### 22. Real-Time Updates

**WebSockets:**
- ✅ **No initially** - Add later if needed
- ✅ **Polling for now:**

```typescript
// Poll for changes every 30 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    const changes = await api.get('/users/me/changes')
    
    if (changes.roleChanged) {
      // Refresh permissions
      const newPerms = await api.get('/permissions')
      useAuthStore.getState().setPermissions(newPerms)
      
      toast.info('Your role has been updated. Some permissions may have changed.')
    }
    
    if (changes.invitationsReceived > 0) {
      toast.info(`You have ${changes.invitationsReceived} new invitation(s)`)
      // Optionally refresh invitations list
    }
  }, 30000) // 30 seconds
  
  return () => clearInterval(interval)
}, [])
```

**When to Add WebSockets:**
- Need instant updates for role changes
- Real-time collaboration features
- More than 1000 concurrent users

**Offline Scenarios:**
- ✅ **Detect offline, show banner:**
```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine)

useEffect(() => {
  const handleOnline = () => setIsOnline(true)
  const handleOffline = () => setIsOnline(false)
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}, [])

// Show banner
{!isOnline && (
  <div className="offline-banner">
    You're offline. Some features may not work.
  </div>
)}
```

**Optimistic UI:**
- ✅ **Yes, for better UX:**

```typescript
async function updateProject(id: string, data: Partial<Project>) {
  // Optimistic update
  const previousProjects = queryClient.getQueryData(['projects'])
  queryClient.setQueryData(['projects'], (old: Project[]) =>
    old.map(p => p.id === id ? { ...p, ...data } : p)
  )
  
  try {
    await api.put(`/projects/${id}`, data)
  } catch (error) {
    // Rollback on error
    queryClient.setQueryData(['projects'], previousProjects)
    toast.error('Failed to update project')
  }
}
```

---

### 23. Permission Checks in UI

**Frontend Permission Checks:**
- ✅ **Yes, for UX** - Hide/disable elements user can't access
- ✅ **Backend still validates** - Frontend is not security layer

**Permission Changes:**
```typescript
// Subscribe to permission changes
useEffect(() => {
  const unsubscribe = useAuthStore.subscribe(
    state => state.permissions,
    (permissions) => {
      // Permissions changed - re-render components
      // Force re-fetch of data that might now be inaccessible
      queryClient.invalidateQueries()
    }
  )
  
  return unsubscribe
}, [])
```

**Show vs Hide:**
- ✅ **Hybrid approach:**
  - **Hide** - For entire features (e.g., Admin panel)
  - **Disable + tooltip** - For actions (e.g., Edit button)

```typescript
// Hide entire section
{hasPermission('users.user.manage') && (
  <AdminPanel />
)}

// Disable button with tooltip
<Tooltip content={!canEdit ? "You don't have permission to edit" : ""}>
  <button 
    onClick={handleEdit}
    disabled={!canEdit}
    className={!canEdit ? 'opacity-50 cursor-not-allowed' : ''}
  >
    Edit
  </button>
</Tooltip>
```

**Permission Component:**
```typescript
// components/RequirePermission.tsx
interface Props {
  permission: string
  fallback?: ReactNode
  showDisabled?: boolean
  children: ReactNode
}

export function RequirePermission({ 
  permission, 
  fallback, 
  showDisabled, 
  children 
}: Props) {
  const { hasPermission } = usePermissions()
  
  if (!hasPermission(permission)) {
    if (showDisabled && isValidElement(children)) {
      return cloneElement(children, { disabled: true })
    }
    return fallback || null
  }
  
  return children
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

---

## Testing

### 24. Test Data Management

**Factory Pattern:**
- ✅ **Yes, use factory library:**

```typescript
// tests/factories/userFactory.ts
import { faker } from '@faker-js/faker'

export const userFactory = {
  build: (overrides?: Partial<User>): User => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    passwordHash: '$2b$12$...',  // Pre-hashed "password"
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),
  
  buildMany: (count: number, overrides?: Partial<User>): User[] => {
    return Array.from({ length: count }, () => userFactory.build(overrides))
  },
  
  create: async (overrides?: Partial<User>): Promise<User> => {
    const user = userFactory.build(overrides)
    return await prisma.user.create({ data: user })
  },
  
  createMany: async (count: number, overrides?: Partial<User>): Promise<User[]> => {
    const users = userFactory.buildMany(count, overrides)
    await prisma.user.createMany({ data: users })
    return users
  }
}

// Similar factories for organizations, roles, memberships, etc.
```

**Database Cleanup:**
- ✅ **Transaction rollback per test (fastest):**

```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

beforeEach(async () => {
  // Start transaction
  await prisma.$executeRaw`BEGIN`
})

afterEach(async () => {
  // Rollback transaction (cleanup)
  await prisma.$executeRaw`ROLLBACK`
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

**Alternative: Truncation** (if transactions don't work)
```typescript
afterEach(async () => {
  const tables = ['users', 'organizations', 'organization_memberships', ...]
  
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`)
  }
})
```

**Test Isolation:**
- ✅ **Transaction rollback** - Cleanest, fastest
- ✅ **Separate test database** - Use `test.db` for SQLite or `myapp_test` for PostgreSQL
- ✅ **Parallel tests:** Use database transactions + test isolation (Jest `--maxWorkers=1` initially)

---

### 25. Mocking Strategy

**External Services:**
- ✅ **Mock in unit tests, real in integration tests:**

```typescript
// Unit test: Mock email service
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-123' })
}))

test('sends invitation email', async () => {
  await inviteUser('test@example.com', 'admin')
  
  expect(emailService.sendEmail).toHaveBeenCalledWith({
    to: 'test@example.com',
    template: 'invitation',
    data: expect.objectContaining({ role: 'admin' })
  })
})

// Integration test: Real email (but use test provider)
// Use Ethereal Email (fake SMTP for testing)
```

**Redis Mocking:**
```typescript
// Unit test: Use redis-mock
import redis from 'redis-mock'

jest.mock('redis', () => require('redis-mock'))

// Integration test: Use real Redis
// Docker container: docker run -p 6379:6379 redis:7-alpine
```

**S3 Mocking:**
```typescript
// Unit test: Mock S3
import { mockClient } from 'aws-sdk-client-mock'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3Mock = mockClient(S3Client)

beforeEach(() => {
  s3Mock.reset()
})

test('uploads file to S3', async () => {
  s3Mock.on(PutObjectCommand).resolves({ ETag: 'test-etag' })
  
  await uploadFile(buffer, 'test.pdf')
  
  expect(s3Mock.calls()).toHaveLength(1)
})

// Integration test: Use MinIO (S3-compatible local storage)
// Docker: docker run -p 9000:9000 minio/minio server /data
```

**Background Jobs:**
```typescript
// Unit test: Mock queue
jest.mock('bull', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    process: jest.fn()
  }))
}))

// Integration test: Process jobs synchronously
const queue = new Queue('test', { redis: redisConnection })

queue.process(async (job) => {
  await processInvitation(job.data)
})

await queue.add('invitation', { email: 'test@example.com' })

// Wait for job to complete
await queue.whenCurrentJobsFinished()
```

**Test Doubles vs Real:**
- ✅ **Unit tests:** Mocks/stubs for external dependencies
- ✅ **Integration tests:** Real implementations (database, Redis, S3)
- ✅ **E2E tests:** Everything real (production-like environment)

---

### 26. E2E Test Data

**Separate Database:**
- ✅ **Yes, use `DATABASE_URL_E2E`:**

```typescript
// playwright.config.ts
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
})
```

**Seeding Test Data:**
- ✅ **Before each test file:**

```typescript
// e2e/setup.ts
import { test as base } from '@playwright/test'

export const test = base.extend({
  // Seed database before each test
  seedData: async ({}, use) => {
    // Reset database
    await resetDatabase()
    
    // Seed with fresh data
    const testData = await seedTestData()
    
    await use(testData)
    
    // Cleanup after test
    await resetDatabase()
  }
})

// e2e/auth.spec.ts
import { test } from './setup'

test('user can login', async ({ page, seedData }) => {
  await page.goto('/login')
  await page.fill('[name=email]', seedData.user.email)
  await page.fill('[name=password]', 'password')
  await page.click('button[type=submit]')
  
  await expect(page).toHaveURL('/dashboard')
})
```

**Cleanup:**
- ✅ **Yes, after each test file:**
  - Drop all tables
  - Re-run migrations
  - Seed with fresh data
- ✅ **Alternative:** Use database snapshots (faster)

```typescript
// Create snapshot before tests
beforeAll(async () => {
  await execSync('pg_dump -d myapp_e2e > snapshot.sql')
})

// Restore snapshot between tests
afterEach(async () => {
  await execSync('psql -d myapp_e2e < snapshot.sql')
})
```

---

## Performance

### 27. Database Query Optimization

**Query Analyzer:**
- ✅ **Yes, use Prisma logging + pg_stat_statements:**

```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  log      = ["query", "info", "warn", "error"]
}

// Log slow queries
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
  ],
})

prisma.$on('query', (e) => {
  if (e.duration > 100) { // Slower than 100ms
    logger.warn('Slow query detected', {
      query: e.query,
      duration: e.duration,
      params: e.params
    })
  }
})
```

**N+1 Query Prevention:**
- ✅ **Use Prisma's include/select:**

```typescript
// ❌ N+1 Query
const users = await prisma.user.findMany()
for (const user of users) {
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId: user.id }
  })
  user.memberships = memberships
}

// ✅ Single query with join
const users = await prisma.user.findMany({
  include: {
    memberships: {
      include: {
        organization: true,
        role: true
      }
    }
  }
})
```

**Pagination:**
- ✅ **Cursor-based in database:**

```typescript
async function getUsers(cursor?: string, limit = 25) {
  return await prisma.user.findMany({
    take: limit,
    skip: cursor ? 1 : 0,  // Skip cursor itself
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' }
  })
}
```

---

### 28. API Response Optimization

**GraphQL:**
- ✅ **No** - REST sufficient, GraphQL adds complexity
- ✅ **Consider later if:** Frontend needs flexible data fetching, many different client apps

**Compression:**
- ✅ **Yes, enable gzip/brotli:**

```typescript
import compression from 'compression'

app.use(compression({
  level: 6,  // Compression level (0-9)
  threshold: 1024,  // Only compress if >1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false
    return compression.filter(req, res)
  }
}))
```

**Response Caching:**
- ✅ **Yes, with ETags:**

```typescript
app.get('/api/organizations/:id', async (req, res) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.params.id }
  })
  
  // Generate ETag from updated timestamp
  const etag = `"${org.updatedAt.getTime()}"`
  
  // Check if client has current version
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).send()  // Not Modified
  }
  
  res.setHeader('ETag', etag)
  res.setHeader('Cache-Control', 'private, max-age=300')  // 5 min
  res.json(org)
})
```

---

### 29. Frontend Performance

**Code Splitting:**
- ✅ **Yes, lazy load routes:**

```typescript
import { lazy, Suspense } from 'react'

const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route 
        path="/admin" 
        element={
          <Suspense fallback={<Spinner />}>
            <AdminPanel />
          </Suspense>
        } 
      />
    </Routes>
  )
}
```

**Image Optimization:**
- ✅ **Process on upload:**

```typescript
import sharp from 'sharp'

async function processAvatar(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(400, 400, { fit: 'cover' })
    .jpeg({ quality: 85 })
    .toBuffer()
}

// Store optimized version, serve from CDN
const optimized = await processAvatar(uploadedFile)
await s3.upload({
  Key: `avatars/${userId}.jpg`,
  Body: optimized,
  ContentType: 'image/jpeg',
  CacheControl: 'max-age=31536000'  // 1 year
})
```

**Virtual Scrolling:**
- ✅ **Yes, for lists >100 items:**

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function UserList({ users }: { users: User[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,  // Row height
    overscan: 5  // Render 5 extra rows for smooth scrolling
  })
  
  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <UserRow user={users[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Monitoring & Observability

### 30. Logging Strategy

**Structured Logging:**
- ✅ **Yes, JSON format:**

```typescript
import winston from 'winston'

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
    new winston.transports.File({ filename: 'combined.log' })
  ]
})

// Usage
logger.info('User logged in', { 
  userId: user.id, 
  organizationId: org.id,
  ip: req.ip
})

logger.error('Failed to send email', {
  error: err.message,
  stack: err.stack,
  context: { userId, emailType: 'invitation' }
})
```

**Log Levels:**
- ✅ **Use all levels appropriately:**
  - **error:** Errors requiring immediate attention
  - **warn:** Potential problems, degraded functionality
  - **info:** Important business events (login, role changes)
  - **debug:** Detailed diagnostic info (development only)

**Log Rotation:**
```typescript
// Use winston-daily-rotate-file
import DailyRotateFile from 'winston-daily-rotate-file'

const transport = new DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',  // Keep logs for 14 days
  compress: true
})

logger.add(transport)
```

---

### 31. Metrics Collection

**Metrics to Track:**
```typescript
import { Counter, Histogram, Gauge, Registry } from 'prom-client'

const registry = new Registry()

// Request metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  registers: [registry]
})

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [registry]
})

// Business metrics
const userLogins = new Counter({
  name: 'user_logins_total',
  help: 'Total user logins',
  labelNames: ['organization_id'],
  registers: [registry]
})

const activeUsers = new Gauge({
  name: 'active_users_current',
  help: 'Currently active users',
  registers: [registry]
})

// Permission check metrics
const permissionChecks = new Counter({
  name: 'permission_checks_total',
  help: 'Total permission checks',
  labelNames: ['result'],  // allowed, denied
  registers: [registry]
})

// Middleware to track request metrics
app.use((req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000
    
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path, status: res.statusCode },
      duration
    )
    
    httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path,
      status: res.statusCode
    })
  })
  
  next()
})

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType)
  res.end(await registry.metrics())
})
```

**Metrics System:**
- ✅ **Prometheus + Grafana** (self-hosted, free)
- ✅ **Alternative:** Datadog (paid, easier setup, better UI)

**Aggregation & Retention:**
- ✅ **Prometheus:** 15 days raw data, downsampled for long-term
- ✅ **Grafana:** Create dashboards, alerts

---

### 32. Error Tracking

**Track All Errors:**
- ✅ **Yes, but filter noise:**

```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of transactions
  
  beforeSend(event, hint) {
    const error = hint.originalException
    
    // Filter out expected errors
    if (error?.message?.includes('ECONNRESET')) return null
    if (event.exception?.values?.[0]?.value?.includes('JWT expired')) return null
    
    // Redact PII
    if (event.request?.data) {
      event.request.data = redactPII(event.request.data)
    }
    
    return event
  }
})

// Express error handler
app.use(Sentry.Handlers.errorHandler())
```

**PII Handling:**
```typescript
function redactPII(data: any): any {
  const sensitive = ['password', 'passwordHash', 'token', 'secret']
  
  if (typeof data !== 'object') return data
  
  const redacted = { ...data }
  for (const key of Object.keys(redacted)) {
    if (sensitive.includes(key)) {
      redacted[key] = '[REDACTED]'
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactPII(redacted[key])
    }
  }
  
  return redacted
}
```

**Error Grouping:**
- ✅ **Sentry handles this automatically**
- ✅ **Custom fingerprinting for better grouping:**

```typescript
Sentry.captureException(error, {
  fingerprint: ['permission-denied', userId, permission]
})
```

---

## Deployment & Compliance

### 33. Database Migrations in Production

**Manual Approval:**
- ✅ **Yes, require manual trigger:**

```yaml
# .github/workflows/deploy.yml
- name: Run migrations
  if: github.event.inputs.run_migrations == 'true'
  run: npm run migrate:deploy
```

**Zero-Downtime Migrations:**
- ✅ **Yes, use expand-contract pattern:**

1. **Expand:** Add new column (nullable)
2. **Deploy:** Application writes to both old and new
3. **Backfill:** Migrate data from old to new column
4. **Contract:** Remove old column

```typescript
// Step 1: Add new column
await prisma.$executeRaw`ALTER TABLE users ADD COLUMN email_new VARCHAR(255)`

// Step 2: Deploy code that writes to both
async function updateUser(id: string, email: string) {
  await prisma.user.update({
    where: { id },
    data: { 
      email,        // Old column
      email_new: email  // New column
    }
  })
}

// Step 3: Backfill data (background job)
await prisma.$executeRaw`UPDATE users SET email_new = email WHERE email_new IS NULL`

// Step 4: Make new column non-nullable, drop old
await prisma.$executeRaw`ALTER TABLE users ALTER COLUMN email_new SET NOT NULL`
await prisma.$executeRaw`ALTER TABLE users DROP COLUMN email`
await prisma.$executeRaw`ALTER TABLE users RENAME COLUMN email_new TO email`
```

**Automatic Backup:**
```bash
#!/bin/bash
# Pre-migration backup script

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup
pg_dump -d $DATABASE_NAME > "backups/pre_migration_$TIMESTAMP.sql"

# Run migration
npm run migrate:deploy

# Test
npm run migrate:status
```

---

### 34. Feature Flags

**Implementation:**
- ✅ **Database-backed flags:**

```prisma
model FeatureFlag {
  id             String   @id @default(uuid())
  key            String   @unique
  enabled        Boolean  @default(false)
  description    String
  
  // Targeting
  enabledForOrgs String[]  // Org IDs
  enabledForUsers String[] // User IDs
  rolloutPercent Int @default(0)  // Gradual rollout: 0-100
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

```typescript
async function isFeatureEnabled(
  key: string, 
  userId?: string, 
  orgId?: string
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key } })
  if (!flag) return false
  
  // Fully enabled
  if (flag.enabled && flag.rolloutPercent === 100) return true
  
  // Targeted orgs
  if (orgId && flag.enabledForOrgs.includes(orgId)) return true
  
  // Targeted users
  if (userId && flag.enabledForUsers.includes(userId)) return true
  
  // Gradual rollout (consistent hashing)
  if (userId && flag.rolloutPercent > 0) {
    const hash = createHash('md5').update(userId + key).digest('hex')
    const userPercent = parseInt(hash.substring(0, 8), 16) % 100
    return userPercent < flag.rolloutPercent
  }
  
  return false
}

// Usage
if (await isFeatureEnabled('custom-roles', user.id, org.id)) {
  // Show custom roles feature
}
```

**Track Usage:**
```typescript
// Log when feature is accessed
logger.info('Feature flag accessed', {
  flag: 'custom-roles',
  enabled: true,
  userId,
  organizationId
})

// Metrics
featureFlagUsage.inc({ flag: 'custom-roles', enabled: 'true' })
```

---

### 35. Rollback Strategy

**Application Rollback:**
- ✅ **Git revert + redeploy:**

```bash
# Identify bad deploy
git log --oneline

# Revert to previous version
git revert <commit-hash>

# Redeploy
git push origin main
# CI/CD automatically deploys
```

**Database Rollback:**
- ✅ **Restore from backup:**

```bash
# Stop application
pm2 stop app

# Restore database
psql -d myapp_prod < backups/pre_migration_20260116.sql

# Deploy previous application version
git checkout <previous-version>
npm install
npm run build
pm2 restart app
```

**Migration Rollback:**
- ✅ **Create down migrations:**

```typescript
// migrations/20260116_add_email_column.ts
export async function up() {
  await prisma.$executeRaw`ALTER TABLE users ADD COLUMN email VARCHAR(255)`
}

export async function down() {
  await prisma.$executeRaw`ALTER TABLE users DROP COLUMN email`
}
```

**Breaking API Changes:**
- ✅ **Maintain API versioning:**
  - Keep v1 running
  - Deploy v2 alongside
  - Gradually migrate clients
  - Deprecate v1 after migration window
  
---

## Summary of Key Decisions

### Database & Caching
- Transaction-based test isolation
- Partial indexes for active records
- Redis for sessions/cache with fallback to DB
- Cursor-based pagination

### Background Jobs
- Job-specific retry strategies
- Priority queues for critical operations
- Bull queue with Redis backend
- Comprehensive job monitoring

### Email & Communication
- Track delivery status via webhooks
- Filesystem templates with DB overrides
- Per-org rate limiting
- Stagger bulk emails

### Security
- JWT rotation without session invalidation
- Device fingerprinting for session validation
- Password history (last 5)
- HaveIBeenPwned integration
- Re-auth for sensitive operations

### Frontend
- Zustand for state management
- Polling over WebSockets initially
- Hybrid show/disable for permissions
- Virtual scrolling for large lists

### Testing
- Factory pattern for test data
- Transaction rollback for cleanup
- Mock external services in unit tests
- Separate E2E database

### Performance
- Structured logging (JSON)
- Prometheus + Grafana metrics
- Sentry error tracking
- Response compression & caching

### Deployment
- Manual production migrations
- Zero-downtime deployment strategy
- Database-backed feature flags
- Automated backups before migrations

---

All answers prioritize **security** (defense in depth, encryption, validation) and **flexibility** (extensible architecture, feature flags, versioning) while remaining pragmatic and implementable. Ready to code! 🚀
