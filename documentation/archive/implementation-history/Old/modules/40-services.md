# Services Module

**Category:** Backend Services  
**Location:** `server/src/services/`  
**Last Updated:** 2025-01-27

---

## Overview

The Services Module provides the business logic layer for the Coder IDE backend. It contains 40+ service classes that handle complex business operations, data transformation, and service orchestration.

## Purpose

- Business logic implementation
- Data processing and transformation
- Service orchestration
- Complex operation coordination
- Data validation
- Business rule enforcement

---

## Key Components

### 1. Core Services

#### User Service (`userService.ts`)

**Purpose:** User management

**Features:**
- User CRUD operations
- Profile management
- Password management
- Session management

#### Organization Service (`organizationService.ts`)

**Purpose:** Organization management

**Features:**
- Organization CRUD
- Settings management
- Membership management
- Slug generation

#### Team Service (`team/`)

**Purpose:** Team management

**Features:**
- Team CRUD
- Member management
- Team hierarchy

#### Permission Service (`permissionService.ts`)

**Purpose:** Permission management

**Features:**
- Permission checking
- Wildcard resolution
- Permission caching
- Scope validation

#### Role Service (`roleService.ts`)

**Purpose:** Role management

**Features:**
- Role CRUD
- Permission assignment
- Role hierarchy

### 2. Authentication Services

#### Auth Provider Service (`authProviderService.ts`)

**Purpose:** OAuth provider management

**Features:**
- Provider linking
- Provider unlinking
- Provider validation

#### Session Service (`sessionService.ts`)

**Purpose:** Session management

**Features:**
- Session creation
- Session validation
- Session revocation
- Session tracking

#### Password Services

**Password History Service** (`passwordHistoryService.ts`)
- Password history tracking
- Password reuse prevention

**Password Reset Service** (`passwordResetService.ts`)
- Password reset tokens
- Password reset flow

**Login Attempt Service** (`loginAttemptService.ts`)
- Login attempt tracking
- Brute force protection

### 3. Collaboration Services

#### Membership Service (`membershipService.ts`)

**Purpose:** Organization membership management

**Features:**
- Membership CRUD
- Status management
- Role assignment

#### Invitation Service (`invitationService.ts`)

**Purpose:** Invitation management

**Features:**
- Invitation creation
- Invitation acceptance
- Invitation expiration

#### Follow Service (`followService.ts`)

**Purpose:** User following

**Features:**
- Follow/unfollow
- Follower tracking
- Following feed

#### Watch Service (`watchService.ts`)

**Purpose:** Resource watching

**Features:**
- Watch resources
- Notification triggers
- Watch management

#### Star Service (`starService.ts`)

**Purpose:** Resource starring

**Features:**
- Star/unstar
- Starred items list

### 4. Productivity Services

#### Calendar Services

**Calendar Event Service** - Calendar event management

#### Messaging Services

**Conversation Manager** - Conversation management

#### Knowledge Services

**Knowledge Base Service** - Knowledge base management

#### Review Services

**Review Checklist Service** (`review/ReviewChecklistService.ts`)
- Review checklist management
- Checklist templates

#### Learning Services

**Learning Resource Service** - Learning resource management

#### Architecture Services

**Architecture Service** - Architecture management

#### Release Services

**Release Service** - Release management

#### Dependency Services

**Dependency Service** - Dependency tracking

#### Debt Services

**Debt Service** - Technical debt management

#### Pairing Services

**Pairing Service** - Pair programming management

#### Capacity Services

**Capacity Service** - Capacity planning

#### Pattern Services

**Pattern Service** (`pattern/CrossProjectPatternService.ts`)
- Pattern library
- Cross-project patterns

#### Compliance Services

**Compliance Service** (`compliance/RetentionPolicySchedulerService.ts`)
- Compliance management
- Retention policies

#### Innovation Services

**Innovation Service** - Innovation management

#### Experiment Services

**Experiment Service** - Experiment tracking

### 5. System Services

#### Email Service (`emailService.ts`)

**Purpose:** Email sending

**Features:**
- Email templates
- Email sending
- Email queue

#### Cache Service (`cacheService.ts`)

**Purpose:** Caching

**Features:**
- Cache management
- Cache invalidation
- Cache strategies

#### Audit Service (`auditService.ts`)

**Purpose:** Audit logging

**Features:**
- Audit log creation
- Audit log querying
- Audit log archiving

#### Account Service (`accountService.ts`)

**Purpose:** Account management

**Features:**
- Account operations
- Account settings
- Account lifecycle

### 6. Specialized Services

#### Embedding Service (`EmbeddingService.ts`)

**Purpose:** Embedding generation

**Features:**
- Code embeddings
- Document embeddings
- Similarity search

#### Feedback Services (`feedback/`)

**Feedback Service** (`FeedbackService.ts`)
- Feedback management
- Feedback analysis

**Feedback API Key Service** (`FeedbackApiKeyService.ts`)
- API key management
- API key validation

**Feedback Recommendation Service** (`FeedbackRecommendationService.ts`)
- Recommendation generation
- Recommendation ranking

#### MCP Services (`mcp/`)

**MCP Server Service** (`MCPServerService.ts`)
- MCP server management

**MCP Server Catalog Service** (`MCPServerCatalogService.ts`)
- Server catalog management

**MCP Server Sync Service** (`MCPServerSyncService.ts`)
- Server synchronization

**MCP Sync Scheduler Service** (`MCPSyncSchedulerService.ts`)
- Sync scheduling

#### Metrics Services (`metrics/`)

**Metrics Service** - Metrics collection and analysis

#### Log Services (`logs/`)

**Log Ingestion Service** (`LogIngestionService.ts`)
- Log ingestion

**Log Analysis Service** (`LogAnalysisService.ts`)
- Log analysis

**Log Providers:**
- Azure Log Analytics Provider
- Splunk Provider

**Recommendation Learning Service** (`RecommendationLearningService.ts`)
- Learning from logs

#### Dashboard Services (`dashboard/`)

**Dashboard Service** (`DashboardService.ts`)
- Dashboard management

**Widget Catalog Service** (`WidgetCatalogService.ts`)
- Widget catalog

#### Prompt Services (`prompts/`)

**Prompt Service** - Prompt management

#### Style Services (`style/`)

**Style Guide Service** - Style guide management

#### Organization Services (`organization/`)

**Organization Best Practice Service** (`OrganizationBestPracticeService.ts`)
- Best practice management

#### Benchmark Services (`benchmark/`)

**Industry Benchmark Service** (`IndustryBenchmarkService.ts`)
- Industry benchmarking

---

## Service Patterns

### Service Structure

```typescript
export class XxxService {
  private db: PrismaClient;
  
  constructor() {
    this.db = getDatabaseClient();
  }
  
  async create(data: CreateXxxInput): Promise<Xxx> {
    // Validation
    // Business logic
    // Database operation
    // Return result
  }
  
  async getById(id: string): Promise<Xxx | null> {
    return await this.db.xxx.findUnique({ where: { id } });
  }
  
  async update(id: string, data: UpdateXxxInput): Promise<Xxx> {
    // Validation
    // Business logic
    // Database operation
    // Return result
  }
  
  async delete(id: string): Promise<void> {
    await this.db.xxx.delete({ where: { id } });
  }
}
```

### Service Orchestration

Services can call other services:

```typescript
export class ProjectService {
  private taskService: TaskService;
  private roadmapService: RoadmapService;
  
  async createProject(data: CreateProjectInput): Promise<Project> {
    // Create project
    const project = await this.db.project.create({ data });
    
    // Create default roadmap
    await this.roadmapService.createDefaultRoadmap(project.id);
    
    // Create initial tasks
    await this.taskService.createInitialTasks(project.id);
    
    return project;
  }
}
```

---

## Service Responsibilities

### Data Transformation

Services transform data between:
- API format ↔ Database format
- Internal format ↔ External format
- Request format ↔ Response format

### Business Logic

Services implement:
- Business rules
- Validation logic
- Calculation logic
- Workflow logic

### Error Handling

Services handle:
- Validation errors
- Business rule violations
- Database errors
- External service errors

---

## Usage Examples

### Use Service in Route

```typescript
fastify.post('/api/projects', {
  preHandler: [authenticateRequest, requirePermission('projects.project.create')],
  handler: async (request, reply) => {
    const projectService = new ProjectService();
    const project = await projectService.create(request.body);
    return project;
  },
});
```

### Service with Dependencies

```typescript
const userService = new UserService();
const organizationService = new OrganizationService();
const permissionService = new PermissionService();

// Services can use each other
const org = await organizationService.create({ name: 'New Org' });
const user = await userService.create({ email: 'user@example.com' });
await organizationService.addMember(org.id, user.id, 'admin');
```

---

## Related Modules

- **API Server Module** - Routes use services
- **Database Module** - Services use database
- **Middleware Module** - Services used by middleware

---

## Summary

The Services Module provides comprehensive business logic for the Coder IDE backend. With 40+ service classes covering all application features, it enables clean separation of concerns and reusable business logic throughout the application.
