# MCP Server Module Specification

**Version:** 1.0.0  
**Last Updated:** 2026-01-20  
**Status:** Draft  
**Module Category:** AI & Intelligence / Infrastructure

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [Capability Taxonomy](#4-capability-taxonomy)
5. [MCP Server Catalog](#5-mcp-server-catalog)
6. [Transport & Protocol](#6-transport--protocol)
7. [Authentication & Secrets](#7-authentication--secrets)
8. [Module Integration](#8-module-integration)

---

## 1. Overview

### 1.1 Purpose

The MCP Server Module serves as the **central hub** for managing, discovering, and orchestrating Model Context Protocol (MCP) servers within Coder IDE. It provides a unified interface for other modules (Planning, Code Generation, Knowledge Base, Agents, etc.) to leverage MCP server capabilities.

### 1.2 Key Responsibilities

- **Catalog Management**: Maintain a catalog of default and custom MCP servers
- **Capability Discovery**: Enable modules to discover available tools and capabilities
- **Access Control**: Manage server availability at organization, team, and project levels
- **Execution Routing**: Route tool requests to appropriate MCP servers based on capabilities
- **Health Monitoring**: Track server status, performance, and usage analytics
- **Security Enforcement**: Apply sandboxing, rate limiting, and audit logging

### 1.3 Design Principles

1. **Standards Compliance**: Follow the Anthropic MCP specification as closely as possible
2. **Centralized Registry**: Single source of truth for all MCP server configurations
3. **Capability-Based Routing**: Match requests to servers by capability, not by name
4. **Multi-Tenancy**: Support organization-specific configurations and custom servers
5. **Fail-Safe Operation**: Graceful degradation with failover support

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Consumer Modules                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Planning │ │  Code    │ │Knowledge │ │  Agent   │ │  Other   │          │
│  │  Module  │ │   Gen    │ │   Base   │ │  System  │ │ Modules  │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │            │            │            │            │                 │
│       └────────────┴────────────┼────────────┴────────────┘                 │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MCP Server Module                                 │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                   Central Registry                           │   │   │
│  │  │  • Server Catalog (Default + Custom)                        │   │   │
│  │  │  • Capability Index                                          │   │   │
│  │  │  • Tool Schema Registry                                      │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                              │                                      │   │
│  │  ┌───────────────┬───────────┼───────────┬───────────────┐         │   │
│  │  ▼               ▼           ▼           ▼               ▼         │   │
│  │ ┌─────┐     ┌─────────┐ ┌─────────┐ ┌─────────┐    ┌─────────┐    │   │
│  │ │Exec │     │ Health  │ │ Access  │ │Security │    │ Audit   │    │   │
│  │ │Router│    │ Monitor │ │ Control │ │Enforcer │    │ Logger  │    │   │
│  │ └──┬──┘     └─────────┘ └─────────┘ └─────────┘    └─────────┘    │   │
│  │    │                                                               │   │
│  └────┼───────────────────────────────────────────────────────────────┘   │
│       │                                                                    │
└───────┼────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MCP Server Connections                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   Local Stdio   │  │   Local HTTP    │  │     Remote      │             │
│  │    Servers      │  │    Servers      │  │    Servers      │             │
│  │  (Child Proc)   │  │  (localhost)    │  │   (HTTP/SSE)    │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Breakdown

| Component | Responsibility |
|-----------|----------------|
| **Central Registry** | Maintains catalog of all MCP servers, capabilities, and tool schemas |
| **Execution Router** | Routes tool execution requests to appropriate servers based on capability matching |
| **Health Monitor** | Tracks server availability, latency, error rates |
| **Access Controller** | Enforces org/team/project-level toggles and permissions |
| **Security Enforcer** | Applies sandboxing, rate limits, permission scoping |
| **Audit Logger** | Records all MCP operations for compliance and debugging |

### 2.3 Module Location

```
src/
├── core/
│   └── mcp/
│       ├── index.ts                    # Module exports
│       ├── registry/
│       │   ├── MCPRegistry.ts          # Central registry implementation
│       │   ├── CapabilityIndex.ts      # Capability-based indexing
│       │   └── ToolSchemaRegistry.ts   # Tool schema management
│       ├── router/
│       │   ├── ExecutionRouter.ts      # Capability-based routing
│       │   ├── LoadBalancer.ts         # Multi-server load balancing
│       │   └── FailoverManager.ts      # Automatic failover handling
│       ├── transport/
│       │   ├── StdioTransport.ts       # Stdio-based communication
│       │   ├── HttpTransport.ts        # HTTP/SSE communication
│       │   └── TransportFactory.ts     # Transport instantiation
│       ├── security/
│       │   ├── Sandbox.ts              # Execution sandboxing
│       │   ├── RateLimiter.ts          # Rate limiting
│       │   ├── PermissionScoper.ts     # Resource permission scoping
│       │   └── AuditLogger.ts          # Operation audit logging
│       ├── health/
│       │   ├── HealthMonitor.ts        # Server health tracking
│       │   └── UsageAnalytics.ts       # Usage statistics
│       └── types/
│           ├── mcp.types.ts            # MCP-specific types
│           ├── capability.types.ts     # Capability taxonomy types
│           └── config.types.ts         # Configuration types
│
├── renderer/
│   ├── components/
│   │   └── mcp/
│   │       ├── ServerCatalog/          # Server catalog browser
│   │       ├── ServerDetail/           # Server detail view
│   │       ├── ToolBrowser/            # Tool exploration UI
│   │       ├── ServerConfig/           # Configuration forms
│   │       └── AnalyticsDashboard/     # Usage analytics
│   └── contexts/
│       └── MCPContext.tsx              # MCP state management
│
server/
├── src/
│   ├── routes/
│   │   └── mcp/
│   │       ├── servers.ts              # Server CRUD endpoints
│   │       ├── catalog.ts              # Catalog management
│   │       ├── tools.ts                # Tool discovery endpoints
│   │       └── execute.ts              # Tool execution endpoints
│   └── services/
│       └── mcp/
│           ├── MCPServerService.ts     # Server management service
│           ├── MCPExecutionService.ts  # Execution orchestration
│           └── MCPAnalyticsService.ts  # Analytics service
└── database/
    └── migrations/
        └── mcp/                        # MCP-related migrations
```

---

## 3. Data Models

### 3.1 Database Architecture

> **Shared Database**: All MCP Server data resides in the shared Cosmos DB NoSQL database alongside other module containers. The `mcp` container stores all MCP server-related documents.
> 
> See: [Architecture Document](../architecture.md)

### 3.2 Table Mapping

| Prisma Model | Database Table | Description |
|--------------|----------------|-------------|
| `MCPServer` | `mcp_servers` | MCP server catalog |
| `MCPServerVersion` | `mcp_server_versions` | Server version history |
| `MCPServerCapability` | `mcp_server_capabilities` | Server capabilities |
| `MCPTool` | `mcp_tools` | Available tools |
| `MCPServerConfiguration` | `mcp_server_configurations` | Server configurations |
| `MCPServerToggle` | `mcp_server_toggles` | Enable/disable toggles |
| `MCPOrganizationSettings` | `mcp_organization_settings` | Org-level MCP settings |
| `MCPExecution` | `mcp_executions` | Tool execution logs |
| `MCPHealthCheck` | `mcp_health_checks` | Health check results |
| `MCPServerMetrics` | `mcp_server_metrics` | Usage metrics |

**Foreign Keys to Core Tables:**
- `mcp_servers.organization_id` → `organizations.id`
- `mcp_servers.created_by_id` → `users.id`
- `mcp_executions.user_id` → `users.id`
- `mcp_executions.project_id` → `projects.id`

### 3.3 Database Schema

```prisma
// ============================================================
// MCP SERVER CATALOG
// All tables prefixed with 'mcp_' in shared database
// Foreign keys reference core tables (users, organizations, projects, teams)
// ============================================================

model MCPServer {
  @@map("mcp_servers")
  id                    String                @id @default(uuid())
  
  // Basic Information
  name                  String
  displayName           String
  description           String?
  version               String
  
  // Classification
  type                  MCPServerType         // DEFAULT, CUSTOM, COMMUNITY
  status                MCPServerStatus       // ACTIVE, DEPRECATED, ARCHIVED
  verificationStatus    VerificationStatus    // VERIFIED, UNVERIFIED, PENDING
  
  // Source & Installation
  source                MCPServerSource       // LOCAL_STDIO, LOCAL_HTTP, REMOTE
  installationType      InstallationType?     // DOCKER, NPM, BINARY, GIT
  installationConfig    Json?                 // Installation-specific config
  
  // Connection
  endpoint              String?               // For remote servers
  command               String?               // For stdio servers
  args                  String[]              // Command arguments
  env                   Json?                 // Environment variables
  
  // Transport
  transportType         TransportType         // STDIO, HTTP_SSE, WEBSOCKET
  transportConfig       Json?                 // Transport-specific config
  
  // Capabilities
  capabilities          MCPServerCapability[]
  tools                 MCPTool[]
  
  // Metadata
  iconUrl               String?
  documentationUrl      String?
  repositoryUrl         String?
  author                String?
  license               String?
  tags                  String[]
  
  // Flags
  isRecommended         Boolean               @default(false)
  isFeatured            Boolean               @default(false)
  
  // Ownership (null for default catalog)
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  createdById           String?
  createdBy             User?                 @relation(fields: [createdById], references: [id])
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  deprecatedAt          DateTime?
  
  // Relations
  versions              MCPServerVersion[]
  configurations        MCPServerConfiguration[]
  toggles               MCPServerToggle[]
  executions            MCPExecution[]
  healthChecks          MCPHealthCheck[]
  
  @@map("mcp_servers")
  @@unique([name, organizationId])
  @@index([type, status])
  @@index([organizationId])
}

enum MCPServerType {
  DEFAULT               // Platform-provided, managed by Super Admin
  CUSTOM                // Organization-specific, managed by Org Admin
  COMMUNITY             // Community-contributed (future)
}

enum MCPServerStatus {
  ACTIVE
  DEPRECATED
  ARCHIVED
  DISABLED
}

enum VerificationStatus {
  VERIFIED              // Officially verified
  UNVERIFIED            // Not verified
  PENDING               // Verification in progress
}

enum MCPServerSource {
  LOCAL_STDIO           // Local process via stdio
  LOCAL_HTTP            // Local HTTP server
  REMOTE                // Remote server
}

enum InstallationType {
  DOCKER
  NPM
  BINARY
  GIT
  MANUAL
}

enum TransportType {
  STDIO
  HTTP_SSE
  WEBSOCKET
}

// ============================================================
// SERVER VERSIONING
// ============================================================

model MCPServerVersion {
  id                    String                @id @default(uuid())
  serverId              String
  server                MCPServer             @relation(fields: [serverId], references: [id], onDelete: Cascade)
  
  version               String
  changelog             String?
  releaseNotes          String?
  
  // Version-specific config
  installationConfig    Json?
  command               String?
  args                  String[]
  
  // Status
  isLatest              Boolean               @default(false)
  isStable              Boolean               @default(true)
  
  // Timestamps
  releasedAt            DateTime              @default(now())
  deprecatedAt          DateTime?
  
  @@map("mcp_server_versions")
  @@unique([serverId, version])
}

// ============================================================
// CAPABILITIES & TOOLS
// ============================================================

model MCPServerCapability {
  id                    String                @id @default(uuid())
  serverId              String
  server                MCPServer             @relation(fields: [serverId], references: [id], onDelete: Cascade)
  
  // Capability classification
  category              String                // e.g., "filesystem", "database"
  subcategory           String?               // e.g., "relational", "nosql"
  capability            String                // e.g., "read", "write", "query"
  
  // Full capability path (computed)
  capabilityPath        String                // e.g., "filesystem.read", "database.relational.query"
  
  // Metadata
  description           String?
  
  @@map("mcp_server_capabilities")
  @@unique([serverId, capabilityPath])
  @@index([capabilityPath])
  @@index([category])
}

model MCPTool {
  id                    String                @id @default(uuid())
  serverId              String
  server                MCPServer             @relation(fields: [serverId], references: [id], onDelete: Cascade)
  
  // Tool identification
  name                  String
  displayName           String
  description           String?
  
  // Schema (JSON Schema format)
  inputSchema           Json                  // Parameters schema
  outputSchema          Json?                 // Return type schema
  
  // Classification
  category              String?
  capabilities          String[]              // Capability paths this tool provides
  
  // Permissions
  permissionLevel       ToolPermissionLevel   @default(STANDARD)
  requiredPermissions   String[]              // Required RBAC permissions
  
  // Metadata
  examples              Json?                 // Usage examples
  isDestructive         Boolean               @default(false)
  isLongRunning         Boolean               @default(false)
  estimatedDuration     Int?                  // Estimated ms
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@map("mcp_tools")
  @@unique([serverId, name])
  @@index([category])
}

enum ToolPermissionLevel {
  STANDARD              // Normal permission level
  ELEVATED              // Requires elevated permissions
  ADMIN                 // Admin-only tools
}

// ============================================================
// CONFIGURATION & TOGGLES
// ============================================================

model MCPServerConfiguration {
  id                    String                @id @default(uuid())
  serverId              String
  server                MCPServer             @relation(fields: [serverId], references: [id], onDelete: Cascade)
  
  // Scope
  scope                 ConfigurationScope
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  teamId                String?
  team                  Team?                 @relation(fields: [teamId], references: [id])
  projectId             String?
  project               Project?              @relation(fields: [projectId], references: [id])
  environmentId         String?
  environment           Environment?          @relation(fields: [environmentId], references: [id])
  
  // Configuration
  config                Json                  // Server-specific configuration
  
  // Execution settings
  timeout               Int?                  // Timeout in ms
  retryPolicy           Json?                 // Retry configuration
  resourceLimits        Json?                 // Resource limits
  
  // Security settings
  sandboxEnabled        Boolean               @default(true)
  sandboxConfig         Json?                 // Sandbox configuration
  permissionScope       Json?                 // Resource access permissions
  rateLimitConfig       Json?                 // Rate limiting settings
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@map("mcp_server_configurations")
  @@unique([serverId, scope, organizationId, teamId, projectId, environmentId])
}

enum ConfigurationScope {
  GLOBAL                // Platform-wide (Super Admin)
  ORGANIZATION          // Organization-level
  TEAM                  // Team-level
  PROJECT               // Project-level
  ENVIRONMENT           // Environment-specific
}

model MCPServerToggle {
  id                    String                @id @default(uuid())
  serverId              String
  server                MCPServer             @relation(fields: [serverId], references: [id], onDelete: Cascade)
  
  // Scope
  scope                 ToggleScope
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  teamId                String?
  team                  Team?                 @relation(fields: [teamId], references: [id])
  projectId             String?
  project               Project?              @relation(fields: [projectId], references: [id])
  
  // Toggle state
  enabled               Boolean               @default(true)
  
  // Priority (for failover ordering)
  priority              Int                   @default(0)
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  updatedById           String?
  updatedBy             User?                 @relation(fields: [updatedById], references: [id])
  
  @@map("mcp_server_toggles")
  @@unique([serverId, scope, organizationId, teamId, projectId])
}

enum ToggleScope {
  ORGANIZATION
  TEAM
  PROJECT
}

// Organization-level MCP feature toggle
model MCPOrganizationSettings {
  @@map("mcp_organization_settings")
  
  id                    String                @id @default(uuid())
  organizationId        String                @unique
  organization          Organization          @relation(fields: [organizationId], references: [id])
  
  // Feature toggle
  mcpEnabled            Boolean               @default(true)
  
  // Default security settings
  defaultSandboxEnabled Boolean               @default(true)
  defaultRateLimitConfig Json?
  
  // Quotas
  maxCustomServers      Int                   @default(50)
  maxExecutionsPerHour  Int                   @default(10000)
  maxConcurrentExecutions Int                 @default(100)
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
}

// ============================================================
// EXECUTION & AUDIT
// ============================================================

model MCPExecution {
  @@map("mcp_executions")
  
  id                    String                @id @default(uuid())
  serverId              String
  server                MCPServer             @relation(fields: [serverId], references: [id])
  toolName              String
  
  // Context
  organizationId        String
  organization          Organization          @relation(fields: [organizationId], references: [id])
  teamId                String?
  team                  Team?                 @relation(fields: [teamId], references: [id])
  projectId             String?
  project               Project?              @relation(fields: [projectId], references: [id])
  userId                String
  user                  User                  @relation(fields: [userId], references: [id])
  
  // Caller context
  callerModule          String                // e.g., "planning", "code-gen", "agent"
  callerAgentId         String?               // If called by an agent
  
  // Execution details
  status                ExecutionStatus
  input                 Json?                 // Input parameters (sanitized)
  output                Json?                 // Output (sanitized)
  error                 String?
  
  // Timing
  startedAt             DateTime              @default(now())
  completedAt           DateTime?
  durationMs            Int?
  
  // Resource usage
  resourceUsage         Json?                 // CPU, memory, etc.
  
  @@index([serverId, startedAt])
  @@index([organizationId, startedAt])
  @@index([userId, startedAt])
  @@index([callerModule])
}

enum ExecutionStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  TIMEOUT
  CANCELLED
}

// ============================================================
// HEALTH & MONITORING
// ============================================================

model MCPHealthCheck {
  @@map("mcp_health_checks")
  
  id                    String                @id @default(uuid())
  serverId              String
  server                MCPServer             @relation(fields: [serverId], references: [id], onDelete: Cascade)
  
  // Health status
  status                HealthStatus
  latencyMs             Int?
  errorMessage          String?
  
  // Timestamp
  checkedAt             DateTime              @default(now())
  
  @@index([serverId, checkedAt])
}

enum HealthStatus {
  HEALTHY
  DEGRADED
  UNHEALTHY
  UNKNOWN
}

model MCPServerMetrics {
  @@map("mcp_server_metrics")
  
  id                    String                @id @default(uuid())
  serverId              String
  server                MCPServer             @relation(fields: [serverId], references: [id], onDelete: Cascade)
  
  // Time window
  periodStart           DateTime
  periodEnd             DateTime
  
  // Execution metrics
  totalExecutions       Int                   @default(0)
  successfulExecutions  Int                   @default(0)
  failedExecutions      Int                   @default(0)
  
  // Timing metrics
  avgLatencyMs          Float?
  p50LatencyMs          Float?
  p95LatencyMs          Float?
  p99LatencyMs          Float?
  
  // Usage by module
  usageByModule         Json?                 // { "planning": 100, "code-gen": 50 }
  usageByOrganization   Json?                 // { "org-id": 100 }
  
  @@unique([serverId, periodStart, periodEnd])
  @@index([serverId, periodStart])
}
```

---

## 4. Capability Taxonomy

### 4.1 Hierarchical Capability Structure

```typescript
interface CapabilityTaxonomy {
  // Level 1: Category
  category: string;
  // Level 2: Subcategory (optional)
  subcategory?: string;
  // Level 3: Capability
  capability: string;
  // Full path: category.subcategory.capability
  path: string;
}
```

### 4.2 Default Capability Categories

```yaml
capabilities:
  # File System Operations
  filesystem:
    local:
      - read
      - write
      - delete
      - list
      - search
      - watch
    remote:
      - read
      - write
      - sync

  # Version Control
  git:
    repository:
      - clone
      - init
      - status
    commits:
      - create
      - read
      - history
    branches:
      - create
      - switch
      - merge
      - delete
    remote:
      - push
      - pull
      - fetch

  # Database Operations
  database:
    relational:
      - query
      - execute
      - schema
      - migrate
    nosql:
      - query
      - execute
      - aggregate
    graph:
      - query
      - traverse
    timeseries:
      - query
      - aggregate
    vector:
      - search
      - index

  # Web & Network
  web:
    http:
      - request
      - fetch
    search:
      - query
      - crawl
    scrape:
      - extract
      - parse

  # Code Operations
  code:
    analysis:
      - parse
      - lint
      - complexity
      - dependencies
    execution:
      - run
      - test
      - debug
    generation:
      - complete
      - refactor
      - document

  # Cloud Providers
  cloud:
    azure:
      - compute
      - storage
      - networking
      - identity
    aws:
      - compute
      - storage
      - networking
      - identity
    gcp:
      - compute
      - storage
      - networking
      - identity

  # DevOps & Deployment
  devops:
    containers:
      - build
      - run
      - manage
    kubernetes:
      - deploy
      - scale
      - monitor
    ci_cd:
      - trigger
      - status
      - logs

  # Documentation & Knowledge
  documentation:
    generate:
      - api
      - readme
      - changelog
    search:
      - semantic
      - keyword

  # Communication
  communication:
    github:
      - issues
      - pull_requests
      - discussions
    notifications:
      - send
      - subscribe

  # Monitoring & Observability
  monitoring:
    logs:
      - query
      - aggregate
    metrics:
      - query
      - alert
    traces:
      - query
      - analyze
```

### 4.3 Capability Registration

```typescript
interface MCPCapabilityDeclaration {
  // Server declares its capabilities
  capabilities: Array<{
    path: string;           // e.g., "filesystem.local.read"
    description?: string;
    tools: string[];        // Tools providing this capability
  }>;
}

// Example: Filesystem MCP Server
const filesystemServerCapabilities: MCPCapabilityDeclaration = {
  capabilities: [
    {
      path: "filesystem.local.read",
      description: "Read files from local filesystem",
      tools: ["read_file", "read_multiple_files", "search_files"]
    },
    {
      path: "filesystem.local.write",
      description: "Write files to local filesystem",
      tools: ["write_file", "edit_file", "create_directory"]
    },
    {
      path: "filesystem.local.list",
      description: "List directory contents",
      tools: ["list_directory", "get_file_info"]
    }
  ]
};
```

---

## 5. MCP Server Catalog

### 5.1 Default Catalog (Platform-Provided)

| Server Name | Category | Capabilities | Source |
|-------------|----------|--------------|--------|
| **filesystem** | Core | `filesystem.*` | Local Stdio |
| **git** | Version Control | `git.*` | Local Stdio |
| **web-fetch** | Web | `web.http.*`, `web.search.*` | Local Stdio |
| **postgres** | Database | `database.relational.*` | Docker |
| **mongodb** | Database | `database.nosql.*` | Docker |
| **code-analyzer** | Code | `code.analysis.*` | Local Stdio |
| **github** | Communication | `communication.github.*` | Remote |
| **azure-tools** | Cloud | `cloud.azure.*` | Remote |
| **aws-tools** | Cloud | `cloud.aws.*` | Remote |
| **gcp-tools** | Cloud | `cloud.gcp.*` | Remote |

### 5.2 Catalog Entry Structure

```typescript
interface MCPCatalogEntry {
  // Identification
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  
  // Classification
  type: 'DEFAULT' | 'CUSTOM' | 'COMMUNITY';
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'PENDING';
  status: 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
  
  // Source
  source: 'LOCAL_STDIO' | 'LOCAL_HTTP' | 'REMOTE';
  installationType?: 'DOCKER' | 'NPM' | 'BINARY' | 'GIT';
  
  // Capabilities
  capabilities: CapabilityDeclaration[];
  tools: ToolDefinition[];
  
  // Metadata
  author?: string;
  license?: string;
  iconUrl?: string;
  documentationUrl?: string;
  repositoryUrl?: string;
  tags: string[];
  
  // Flags
  isRecommended: boolean;
  isFeatured: boolean;
}
```

### 5.3 Super Admin Catalog Operations

| Operation | Description | Permissions |
|-----------|-------------|-------------|
| **Create** | Add new server to default catalog | `mcp.catalog.create` |
| **Update** | Update server configuration/metadata | `mcp.catalog.update` |
| **Deprecate** | Mark server as deprecated | `mcp.catalog.deprecate` |
| **Archive** | Archive (soft delete) server | `mcp.catalog.archive` |
| **Feature** | Mark as featured/recommended | `mcp.catalog.feature` |
| **Version** | Release new version | `mcp.catalog.version` |

### 5.4 Organization Custom Servers

| Operation | Description | Permissions |
|-----------|-------------|-------------|
| **Create** | Add custom server | `mcp.servers.create` |
| **Update** | Update custom server | `mcp.servers.update` |
| **Delete** | Delete custom server | `mcp.servers.delete` |
| **Duplicate** | Duplicate default server for customization | `mcp.servers.duplicate` |
| **Toggle** | Enable/disable servers | `mcp.servers.toggle` |

---

## 6. Transport & Protocol

### 6.1 Transport Types

#### 6.1.1 Stdio Transport (Local)

```typescript
interface StdioTransportConfig {
  type: 'STDIO';
  command: string;           // e.g., "npx", "docker", "node"
  args: string[];            // Command arguments
  env?: Record<string, string>;
  cwd?: string;
  
  // Process management
  restartOnCrash: boolean;
  maxRestarts: number;
  restartDelayMs: number;
}

// Example: Node.js MCP Server
const stdioConfig: StdioTransportConfig = {
  type: 'STDIO',
  command: 'node',
  args: ['./mcp-servers/filesystem/index.js'],
  env: { NODE_ENV: 'production' },
  restartOnCrash: true,
  maxRestarts: 3,
  restartDelayMs: 1000
};

// Example: Docker MCP Server
const dockerConfig: StdioTransportConfig = {
  type: 'STDIO',
  command: 'docker',
  args: [
    'run', '-i', '--rm',
    '-v', '${workspaceFolder}:/workspace',
    'mcp/postgres-server:latest'
  ],
  restartOnCrash: true,
  maxRestarts: 3,
  restartDelayMs: 2000
};
```

#### 6.1.2 HTTP/SSE Transport (Local & Remote)

```typescript
interface HttpTransportConfig {
  type: 'HTTP_SSE';
  baseUrl: string;           // e.g., "http://localhost:3001" or "https://api.example.com"
  
  // Authentication
  auth?: {
    type: 'BEARER' | 'API_KEY' | 'OAUTH2' | 'CUSTOM';
    secretKey?: string;      // Reference to stored secret
    headerName?: string;     // For API_KEY type
    oauth2Config?: OAuth2Config;
  };
  
  // Connection settings
  timeout: number;           // Request timeout in ms
  keepAlive: boolean;
  retryConfig: RetryConfig;
  
  // SSE settings (for streaming)
  sseEndpoint?: string;      // SSE endpoint for real-time updates
}

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}
```

#### 6.1.3 WebSocket Transport (Real-time)

```typescript
interface WebSocketTransportConfig {
  type: 'WEBSOCKET';
  url: string;               // e.g., "wss://api.example.com/mcp"
  
  // Authentication
  auth?: {
    type: 'BEARER' | 'QUERY_PARAM';
    secretKey?: string;
  };
  
  // Connection settings
  reconnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  pingInterval: number;
}
```

### 6.2 MCP Protocol Implementation

Following the Anthropic MCP specification:

```typescript
// MCP Message Types
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

// Standard MCP Methods
type MCPMethod =
  | 'initialize'
  | 'tools/list'
  | 'tools/call'
  | 'resources/list'
  | 'resources/read'
  | 'prompts/list'
  | 'prompts/get'
  | 'notifications/initialized'
  | 'notifications/progress';
```

### 6.3 Transport Selection Logic

```typescript
function selectTransport(server: MCPServer): Transport {
  switch (server.source) {
    case 'LOCAL_STDIO':
      return new StdioTransport(server.transportConfig as StdioTransportConfig);
    
    case 'LOCAL_HTTP':
    case 'REMOTE':
      if (server.transportType === 'WEBSOCKET') {
        return new WebSocketTransport(server.transportConfig as WebSocketTransportConfig);
      }
      return new HttpTransport(server.transportConfig as HttpTransportConfig);
    
    default:
      throw new Error(`Unknown server source: ${server.source}`);
  }
}
```

---

## 7. Authentication & Secrets Integration

### 7.1 Secret Management Module Dependency

The MCP Server Module **delegates all secret management** to the centralized **Secret Management Module**. This ensures:

- **Single source of truth** for all secrets across the platform
- **Consistent security** with unified encryption and access control
- **Shared infrastructure** reusable by other modules (LLM Models, Cloud Integrations, etc.)

> 📖 **See:** [Secret Management Module Specification](../Secret%20Management/secret-management-specification-part1.md)

### 7.2 Integration Pattern

```typescript
// MCP Server Module uses SecretService from Secret Management Module
import { ISecretService, SecretContext } from '@core/secrets';

class MCPServerService {
  constructor(private secretService: ISecretService) {}
  
  async getServerCredentials(
    serverId: string,
    context: ExecutionContext
  ): Promise<AuthCredentials | undefined> {
    const server = await this.getServer(serverId);
    
    if (!server.authSecretId) {
      return undefined;
    }
    
    // Request secret from Secret Management Module
    const secretContext: SecretContext = {
      userId: context.userId,
      organizationId: context.organizationId,
      consumerModule: 'mcp-server',
      consumerResourceId: serverId
    };
    
    const secretValue = await this.secretService.getSecret(
      server.authSecretId,
      secretContext
    );
    
    return this.parseAuthCredentials(secretValue);
  }
}
```

### 7.3 MCP Server Configuration with Secret References

```typescript
// MCP Server stores a reference to the secret, not the secret itself
interface MCPServerConfig {
  id: string;
  name: string;
  endpoint: string;
  
  // Reference to secret stored in Secret Management Module
  authSecretId?: string;      // Secret ID from Secret Management
  
  // Authentication type (determines how to use the secret)
  authType?: 'BEARER' | 'API_KEY' | 'OAUTH2' | 'BASIC';
  authHeaderName?: string;    // For API_KEY type (e.g., "X-API-Key")
}
```

### 7.4 Database Schema Update

```prisma
model MCPServer {
  // ... existing fields ...
  
  // Authentication - references Secret Management Module
  authSecretId          String?               // Reference to Secret in Secret Management
  authType              AuthenticationType?
  authHeaderName        String?               // Custom header name for API keys
  
  // ... rest of fields ...
}

enum AuthenticationType {
  BEARER                // Bearer token in Authorization header
  API_KEY               // API key in custom header
  OAUTH2                // OAuth2 flow
  BASIC                 // Basic authentication
}
```

### 7.5 Secret Scope Recommendations

| MCP Server Type | Recommended Secret Scope |
|-----------------|-------------------------|
| **Default Catalog** (platform-wide) | Global |
| **Custom Server** (organization-specific) | Organization |
| **Project-specific Server** | Project |

---

## 8. Module Integration

### 8.1 Integration Architecture

```typescript
// Central interface for modules to interact with MCP
interface MCPClient {
  // Capability discovery
  discoverCapabilities(filter?: CapabilityFilter): Promise<CapabilityInfo[]>;
  
  // Tool discovery
  discoverTools(filter?: ToolFilter): Promise<ToolInfo[]>;
  
  // Tool execution
  executeTool(request: ToolExecutionRequest): Promise<ToolExecutionResult>;
  
  // Batch execution
  executeTools(requests: ToolExecutionRequest[]): Promise<ToolExecutionResult[]>;
  
  // Async/long-running operations
  executeToolAsync(request: ToolExecutionRequest): Promise<AsyncOperation>;
  getOperationStatus(operationId: string): Promise<OperationStatus>;
  cancelOperation(operationId: string): Promise<void>;
}
```

### 8.2 Capability-Based Tool Request

```typescript
interface ToolExecutionRequest {
  // Option 1: Request by capability
  capability?: string;        // e.g., "filesystem.local.read"
  
  // Option 2: Request specific tool
  serverId?: string;
  toolName?: string;
  
  // Parameters
  params: Record<string, unknown>;
  
  // Execution context
  context: ExecutionContext;
  
  // Options
  options?: {
    timeout?: number;
    async?: boolean;
    preferredServer?: string;  // Hint for server selection
  };
}

interface ExecutionContext {
  organizationId: string;
  teamId?: string;
  projectId?: string;
  userId: string;
  environment?: string;
  
  // Caller identification
  callerModule: string;       // e.g., "planning", "code-gen"
  callerAgentId?: string;
}
```

### 8.3 Module Capability Declaration

Modules should declare their MCP requirements:

```typescript
// Module declares required capabilities
interface ModuleMCPRequirements {
  moduleId: string;
  moduleName: string;
  
  // Required capabilities (module won't function without these)
  required: Array<{
    capability: string;
    reason: string;
  }>;
  
  // Optional capabilities (enhanced functionality)
  optional: Array<{
    capability: string;
    reason: string;
  }>;
}

// Example: Planning Module
const planningModuleRequirements: ModuleMCPRequirements = {
  moduleId: 'planning',
  moduleName: 'Planning Module',
  required: [
    {
      capability: 'filesystem.local.read',
      reason: 'Read project files for context'
    },
    {
      capability: 'code.analysis.parse',
      reason: 'Analyze code structure'
    }
  ],
  optional: [
    {
      capability: 'git.repository.status',
      reason: 'Include git status in planning context'
    },
    {
      capability: 'database.relational.schema',
      reason: 'Include database schema in planning'
    }
  ]
};
```

### 8.4 Capability-Based Routing

```typescript
class ExecutionRouter {
  async routeRequest(request: ToolExecutionRequest): Promise<MCPServer> {
    // If specific server requested
    if (request.serverId && request.toolName) {
      return this.getServer(request.serverId);
    }
    
    // Route by capability
    if (request.capability) {
      const servers = await this.findServersByCapability(
        request.capability,
        request.context
      );
      
      if (servers.length === 0) {
        throw new NoCapableServerError(request.capability);
      }
      
      // Apply priority ordering
      const prioritized = this.applyPriority(servers, request.context);
      
      // Select based on health and load
      return this.selectBestServer(prioritized);
    }
    
    throw new InvalidRequestError('Must specify capability or server/tool');
  }
  
  private async findServersByCapability(
    capability: string,
    context: ExecutionContext
  ): Promise<MCPServer[]> {
    // Get all servers with this capability
    const servers = await this.registry.getServersByCapability(capability);
    
    // Filter by access control (org/team/project toggles)
    const accessible = await this.accessControl.filterAccessible(
      servers,
      context
    );
    
    // Filter by health status
    return accessible.filter(s => s.healthStatus !== 'UNHEALTHY');
  }
}
```

### 8.5 Agent Integration

```typescript
// Agents use the same MCPClient interface
class AIAgent {
  private mcpClient: MCPClient;
  
  async executeWithTools(task: AgentTask): Promise<AgentResult> {
    // Discover available tools dynamically
    const availableTools = await this.mcpClient.discoverTools({
      capabilities: this.getRequiredCapabilities(task)
    });
    
    // Build tool descriptions for LLM
    const toolDescriptions = availableTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }));
    
    // Execute with LLM tool calling
    const result = await this.llm.complete({
      messages: this.buildMessages(task),
      tools: toolDescriptions,
      tool_choice: 'auto'
    });
    
    // Execute tool calls
    for (const toolCall of result.tool_calls) {
      const toolResult = await this.mcpClient.executeTool({
        toolName: toolCall.name,
        params: toolCall.arguments,
        context: this.getExecutionContext()
      });
      
      // Continue agent loop...
    }
  }
}
```

### 8.6 Recommended Agent-Specific MCP Servers

| Server | Purpose | Capabilities |
|--------|---------|--------------|
| **code-sandbox** | Safe code execution for agents | `code.execution.run`, `code.execution.test` |
| **shell-sandbox** | Sandboxed shell execution | `shell.execute` (restricted) |
| **browser-automation** | Web interaction for agents | `web.browser.*` |
| **memory-store** | Agent memory/state persistence | `agent.memory.*` |


# MCP Server Module Specification - Part 2

**Continued from Part 1**

---

## Table of Contents (Part 2)

9. [Security & Sandboxing](#9-security--sandboxing)
10. [Health & Monitoring](#10-health--monitoring)
11. [API Endpoints](#11-api-endpoints)
12. [UI Views](#12-ui-views)
13. [Configuration Reference](#13-configuration-reference)
14. [Implementation Guidelines](#14-implementation-guidelines)

---

## 9. Security & Sandboxing

### 9.1 Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Security Enforcement Layer                            │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Request    │  │  Permission  │  │     Rate     │  │    Audit     │   │
│  │  Validation  │──▶│   Scoping    │──▶│   Limiter    │──▶│   Logger     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│         │                 │                 │                 │            │
│         └─────────────────┼─────────────────┼─────────────────┘            │
│                           ▼                 ▼                              │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                       Sandbox Environment                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │  │
│  │  │  Resource   │  │   Network   │  │   Process   │                 │  │
│  │  │   Limits    │  │  Isolation  │  │  Isolation  │                 │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Permission Scoping

```typescript
interface PermissionScope {
  // Filesystem access
  filesystem?: {
    allowedPaths: string[];      // Allowed directory paths
    deniedPaths: string[];       // Explicitly denied paths
    readOnly?: boolean;          // Read-only access
    maxFileSize?: number;        // Max file size in bytes
  };
  
  // Network access
  network?: {
    allowedHosts: string[];      // Allowed hostnames/IPs
    deniedHosts: string[];       // Denied hostnames/IPs
    allowedPorts: number[];      // Allowed ports
    protocols: ('http' | 'https' | 'ws' | 'wss')[];
  };
  
  // Process execution
  process?: {
    allowedCommands: string[];   // Allowed command patterns
    deniedCommands: string[];    // Denied command patterns
    maxProcesses: number;        // Max concurrent processes
    timeout: number;             // Process timeout in ms
  };
  
  // Database access
  database?: {
    allowedOperations: ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL')[];
    allowedSchemas: string[];
    maxRowsReturned: number;
    maxQueryDuration: number;
  };
  
  // Environment access
  environment?: {
    allowedVars: string[];       // Allowed env var patterns
    deniedVars: string[];        // Denied env var patterns
  };
}

// Example: Restrictive permission scope
const restrictiveScope: PermissionScope = {
  filesystem: {
    allowedPaths: ['${workspaceFolder}/**'],
    deniedPaths: ['**/.env*', '**/secrets/**', '**/.git/**'],
    readOnly: false,
    maxFileSize: 10 * 1024 * 1024  // 10MB
  },
  network: {
    allowedHosts: ['api.github.com', 'registry.npmjs.org'],
    deniedHosts: ['*'],
    allowedPorts: [443],
    protocols: ['https']
  },
  process: {
    allowedCommands: ['git', 'npm', 'node'],
    deniedCommands: ['rm -rf', 'sudo', 'chmod'],
    maxProcesses: 5,
    timeout: 30000
  }
};
```

### 9.3 Sandbox Configuration

```typescript
interface SandboxConfig {
  enabled: boolean;
  
  // Container-based isolation (for Docker servers)
  container?: {
    image: string;
    memoryLimit: string;       // e.g., "512m"
    cpuLimit: string;          // e.g., "0.5"
    networkMode: 'none' | 'bridge' | 'host';
    readOnlyRootFilesystem: boolean;
    dropCapabilities: string[];
    seccompProfile?: string;
  };
  
  // Process-based isolation (for local servers)
  process?: {
    uid?: number;              // Run as specific user
    gid?: number;              // Run as specific group
    chroot?: string;           // Change root directory
    rlimits?: {
      maxMemory: number;       // bytes
      maxCpu: number;          // seconds
      maxOpenFiles: number;
      maxProcesses: number;
    };
  };
  
  // Permission scope
  permissions: PermissionScope;
}

// Organization-level sandbox defaults
interface OrganizationSandboxDefaults {
  organizationId: string;
  
  defaultEnabled: boolean;
  
  // Override capabilities
  allowOverride: boolean;
  maxPermissionLevel: 'RESTRICTED' | 'STANDARD' | 'ELEVATED';
  
  // Default permission scope
  defaultScope: PermissionScope;
  
  // Mandatory restrictions (cannot be overridden)
  mandatoryRestrictions: Partial<PermissionScope>;
}
```

### 9.4 Rate Limiting

```typescript
interface RateLimitConfig {
  enabled: boolean;
  
  // Global limits
  global?: {
    maxRequestsPerSecond: number;
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
  };
  
  // Per-organization limits
  organization?: {
    maxRequestsPerSecond: number;
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    maxConcurrentExecutions: number;
  };
  
  // Per-user limits
  user?: {
    maxRequestsPerSecond: number;
    maxRequestsPerMinute: number;
    maxConcurrentExecutions: number;
  };
  
  // Per-server limits
  server?: {
    maxRequestsPerSecond: number;
    maxConcurrentExecutions: number;
    queueSize: number;
    queueTimeout: number;
  };
  
  // Burst handling
  burst?: {
    enabled: boolean;
    maxBurstSize: number;
    refillRate: number;        // Tokens per second
  };
}

// Rate limit response
interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;         // Seconds until retry
}
```

### 9.5 Audit Logging

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  
  // Event identification
  eventType: AuditEventType;
  eventCategory: 'EXECUTION' | 'CONFIGURATION' | 'ACCESS' | 'SECURITY';
  
  // Actor
  actorType: 'USER' | 'AGENT' | 'SYSTEM';
  actorId: string;
  actorName?: string;
  
  // Context
  organizationId: string;
  teamId?: string;
  projectId?: string;
  
  // Resource
  resourceType: 'MCP_SERVER' | 'MCP_TOOL' | 'MCP_CONFIG' | 'MCP_SECRET';
  resourceId: string;
  resourceName?: string;
  
  // Details
  action: string;
  details: Record<string, unknown>;
  
  // Request/Response (sanitized)
  request?: {
    toolName?: string;
    params?: Record<string, unknown>;  // Sanitized
  };
  response?: {
    status: 'SUCCESS' | 'FAILURE';
    durationMs?: number;
    error?: string;
  };
  
  // Security context
  ipAddress?: string;
  userAgent?: string;
  
  // Outcome
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
  outcomeReason?: string;
}

type AuditEventType =
  | 'TOOL_EXECUTION'
  | 'SERVER_CREATED'
  | 'SERVER_UPDATED'
  | 'SERVER_DELETED'
  | 'SERVER_TOGGLED'
  | 'CONFIG_CHANGED'
  | 'SECRET_ACCESSED'
  | 'SECRET_UPDATED'
  | 'RATE_LIMIT_HIT'
  | 'PERMISSION_DENIED'
  | 'SECURITY_VIOLATION';
```

### 9.6 Security Policies per Organization

```typescript
interface OrganizationSecurityPolicy {
  organizationId: string;
  
  // Sandbox policies
  sandbox: {
    enabled: boolean;
    defaultConfig: SandboxConfig;
    allowServerOverride: boolean;
  };
  
  // Rate limiting policies
  rateLimiting: {
    enabled: boolean;
    config: RateLimitConfig;
  };
  
  // Permission policies
  permissions: {
    defaultScope: PermissionScope;
    maxElevationLevel: 'STANDARD' | 'ELEVATED' | 'ADMIN';
    requireApprovalForElevated: boolean;
  };
  
  // Audit policies
  audit: {
    enabled: boolean;
    logLevel: 'MINIMAL' | 'STANDARD' | 'VERBOSE';
    retentionDays: number;
    includeRequestParams: boolean;
    includeResponseData: boolean;
  };
  
  // Network policies
  network: {
    allowExternalConnections: boolean;
    allowedExternalDomains: string[];
    requireTLS: boolean;
  };
  
  // Custom server policies
  customServers: {
    allowed: boolean;
    requireVerification: boolean;
    maxServers: number;
  };
}
```

---

## 10. Health & Monitoring

### 10.1 Health Check System

```typescript
interface HealthCheckConfig {
  enabled: boolean;
  intervalMs: number;          // Check interval
  timeoutMs: number;           // Health check timeout
  unhealthyThreshold: number;  // Failures before unhealthy
  healthyThreshold: number;    // Successes before healthy
}

interface HealthCheckResult {
  serverId: string;
  timestamp: Date;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  latencyMs: number;
  
  // Detailed checks
  checks: {
    connection: boolean;
    toolsList: boolean;
    sampleExecution?: boolean;
  };
  
  error?: string;
}

class HealthMonitor {
  async checkServerHealth(server: MCPServer): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // 1. Check connection
      const transport = await this.getTransport(server);
      await transport.connect();
      
      // 2. Check tools list
      const tools = await transport.send({
        method: 'tools/list',
        params: {}
      });
      
      // 3. Optional: Sample execution
      let sampleExecution: boolean | undefined;
      if (server.healthCheckTool) {
        try {
          await transport.send({
            method: 'tools/call',
            params: {
              name: server.healthCheckTool,
              arguments: server.healthCheckArgs || {}
            }
          });
          sampleExecution = true;
        } catch {
          sampleExecution = false;
        }
      }
      
      return {
        serverId: server.id,
        timestamp: new Date(),
        status: this.determineStatus(true, true, sampleExecution),
        latencyMs: Date.now() - startTime,
        checks: {
          connection: true,
          toolsList: true,
          sampleExecution
        }
      };
    } catch (error) {
      return {
        serverId: server.id,
        timestamp: new Date(),
        status: 'UNHEALTHY',
        latencyMs: Date.now() - startTime,
        checks: {
          connection: false,
          toolsList: false
        },
        error: error.message
      };
    }
  }
}
```

### 10.2 Usage Analytics

```typescript
interface UsageAnalytics {
  // Time-based aggregations
  getUsageOverTime(params: {
    serverId?: string;
    organizationId?: string;
    periodStart: Date;
    periodEnd: Date;
    granularity: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
  }): Promise<TimeSeriesData[]>;
  
  // Top N queries
  getTopServers(params: {
    organizationId?: string;
    period: 'DAY' | 'WEEK' | 'MONTH';
    limit: number;
  }): Promise<TopServerUsage[]>;
  
  getTopTools(params: {
    serverId?: string;
    organizationId?: string;
    period: 'DAY' | 'WEEK' | 'MONTH';
    limit: number;
  }): Promise<TopToolUsage[]>;
  
  getTopModules(params: {
    serverId?: string;
    period: 'DAY' | 'WEEK' | 'MONTH';
    limit: number;
  }): Promise<TopModuleUsage[]>;
  
  // Performance metrics
  getPerformanceMetrics(params: {
    serverId: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<PerformanceMetrics>;
  
  // Error analysis
  getErrorAnalysis(params: {
    serverId?: string;
    organizationId?: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<ErrorAnalysis>;
}

interface TimeSeriesData {
  timestamp: Date;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgLatencyMs: number;
}

interface TopServerUsage {
  serverId: string;
  serverName: string;
  totalExecutions: number;
  uniqueUsers: number;
  avgLatencyMs: number;
  successRate: number;
}

interface TopToolUsage {
  serverId: string;
  toolName: string;
  totalExecutions: number;
  avgLatencyMs: number;
  successRate: number;
}

interface TopModuleUsage {
  moduleId: string;
  moduleName: string;
  totalExecutions: number;
  uniqueTools: number;
  avgLatencyMs: number;
}

interface PerformanceMetrics {
  serverId: string;
  period: { start: Date; end: Date };
  
  // Execution metrics
  totalExecutions: number;
  successRate: number;
  errorRate: number;
  timeoutRate: number;
  
  // Latency metrics
  latency: {
    avg: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  
  // Throughput
  throughput: {
    avgPerSecond: number;
    peakPerSecond: number;
  };
  
  // Availability
  availability: {
    uptimePercent: number;
    healthyChecks: number;
    totalChecks: number;
  };
}

interface ErrorAnalysis {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByServer: Record<string, number>;
  errorsByTool: Record<string, number>;
  recentErrors: Array<{
    timestamp: Date;
    serverId: string;
    toolName: string;
    errorType: string;
    errorMessage: string;
  }>;
}
```

### 10.3 Alerting

```typescript
interface AlertConfig {
  id: string;
  name: string;
  enabled: boolean;
  
  // Trigger conditions
  condition: AlertCondition;
  
  // Evaluation
  evaluationInterval: number;  // seconds
  evaluationWindow: number;    // seconds
  
  // Notification
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  notificationChannels: string[];
  
  // Cooldown
  cooldownMinutes: number;
}

type AlertCondition =
  | { type: 'ERROR_RATE'; threshold: number; serverId?: string }
  | { type: 'LATENCY_P95'; threshold: number; serverId?: string }
  | { type: 'AVAILABILITY'; threshold: number; serverId?: string }
  | { type: 'RATE_LIMIT_UTILIZATION'; threshold: number; organizationId?: string }
  | { type: 'SERVER_UNHEALTHY'; serverId: string };

// Example alerts
const defaultAlerts: AlertConfig[] = [
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    enabled: true,
    condition: { type: 'ERROR_RATE', threshold: 0.05 },  // 5%
    evaluationInterval: 60,
    evaluationWindow: 300,
    severity: 'WARNING',
    notificationChannels: ['email', 'slack'],
    cooldownMinutes: 15
  },
  {
    id: 'server-down',
    name: 'Server Unhealthy',
    enabled: true,
    condition: { type: 'AVAILABILITY', threshold: 0.95 },
    evaluationInterval: 30,
    evaluationWindow: 180,
    severity: 'CRITICAL',
    notificationChannels: ['email', 'slack', 'pagerduty'],
    cooldownMinutes: 5
  }
];
```

---

## 11. API Endpoints

### 11.1 Server Management

```typescript
// ============================================================
// CATALOG & SERVERS
// ============================================================

// GET /api/mcp/catalog
// List all servers in catalog (filtered by access)
interface ListCatalogParams {
  type?: MCPServerType[];
  status?: MCPServerStatus[];
  category?: string;
  capability?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// GET /api/mcp/servers/:id
// Get server details
interface GetServerResponse {
  server: MCPServer;
  tools: MCPTool[];
  capabilities: MCPServerCapability[];
  healthStatus: HealthStatus;
  configuration?: MCPServerConfiguration;
}

// POST /api/mcp/servers (Org Admin - custom servers)
// Create custom server
interface CreateServerRequest {
  name: string;
  displayName: string;
  description?: string;
  source: MCPServerSource;
  transportType: TransportType;
  
  // Connection details
  endpoint?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  
  // Installation (for Docker)
  installationType?: InstallationType;
  installationConfig?: object;
  
  // Metadata
  iconUrl?: string;
  documentationUrl?: string;
  tags?: string[];
}

// PUT /api/mcp/servers/:id
// Update server
interface UpdateServerRequest {
  displayName?: string;
  description?: string;
  endpoint?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  tags?: string[];
}

// DELETE /api/mcp/servers/:id
// Delete custom server

// POST /api/mcp/servers/:id/duplicate (Org Admin)
// Duplicate a default server as custom
interface DuplicateServerRequest {
  newName: string;
  newDisplayName: string;
}

// ============================================================
// CATALOG MANAGEMENT (Super Admin)
// ============================================================

// POST /api/mcp/catalog/servers (Super Admin)
// Add server to default catalog
interface AddToCatalogRequest extends CreateServerRequest {
  version: string;
  author?: string;
  license?: string;
  isRecommended?: boolean;
  isFeatured?: boolean;
}

// PUT /api/mcp/catalog/servers/:id (Super Admin)
// Update catalog server

// POST /api/mcp/catalog/servers/:id/deprecate (Super Admin)
// Deprecate server
interface DeprecateServerRequest {
  reason: string;
  replacementServerId?: string;
}

// POST /api/mcp/catalog/servers/:id/archive (Super Admin)
// Archive server

// POST /api/mcp/catalog/servers/:id/versions (Super Admin)
// Release new version
interface ReleaseVersionRequest {
  version: string;
  changelog?: string;
  releaseNotes?: string;
  installationConfig?: object;
  isStable?: boolean;
}
```

### 11.2 Toggle & Configuration

```typescript
// ============================================================
// TOGGLES
// ============================================================

// GET /api/mcp/toggles
// List all toggles for current context
interface ListTogglesParams {
  scope?: ToggleScope;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
}

// PUT /api/mcp/servers/:id/toggle
// Toggle server enabled state
interface ToggleServerRequest {
  scope: ToggleScope;
  targetId: string;          // orgId, teamId, or projectId
  enabled: boolean;
  priority?: number;
}

// PUT /api/mcp/organization/:orgId/mcp-settings
// Update organization MCP settings
interface UpdateOrgMCPSettingsRequest {
  mcpEnabled?: boolean;
  defaultSandboxEnabled?: boolean;
  defaultRateLimitConfig?: RateLimitConfig;
  maxCustomServers?: number;
  maxExecutionsPerHour?: number;
}

// ============================================================
// CONFIGURATION
// ============================================================

// GET /api/mcp/servers/:id/configuration
// Get server configuration for current context

// PUT /api/mcp/servers/:id/configuration
// Update server configuration
interface UpdateConfigurationRequest {
  scope: ConfigurationScope;
  targetId?: string;
  
  config?: object;
  timeout?: number;
  retryPolicy?: RetryConfig;
  resourceLimits?: object;
  
  sandboxEnabled?: boolean;
  sandboxConfig?: SandboxConfig;
  permissionScope?: PermissionScope;
  rateLimitConfig?: RateLimitConfig;
}
```

### 11.3 Tool Discovery & Execution

```typescript
// ============================================================
// TOOL DISCOVERY
// ============================================================

// GET /api/mcp/tools
// List available tools
interface ListToolsParams {
  serverId?: string;
  capability?: string;
  category?: string;
  search?: string;
  permissionLevel?: ToolPermissionLevel;
}

// GET /api/mcp/tools/:serverId/:toolName
// Get tool details with schema

// GET /api/mcp/capabilities
// List available capabilities
interface ListCapabilitiesParams {
  category?: string;
  available?: boolean;       // Only show capabilities with enabled servers
}

// ============================================================
// EXECUTION
// ============================================================

// POST /api/mcp/execute
// Execute a tool
interface ExecuteToolRequest {
  // By capability (routed automatically)
  capability?: string;
  
  // By specific server/tool
  serverId?: string;
  toolName?: string;
  
  // Parameters
  params: Record<string, unknown>;
  
  // Context override
  teamId?: string;
  projectId?: string;
  environment?: string;
  
  // Options
  timeout?: number;
  async?: boolean;
}

interface ExecuteToolResponse {
  executionId: string;
  status: 'COMPLETED' | 'PENDING' | 'RUNNING';
  result?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  durationMs?: number;
  serverId: string;
  toolName: string;
}

// POST /api/mcp/execute/batch
// Execute multiple tools
interface BatchExecuteRequest {
  executions: ExecuteToolRequest[];
  parallel?: boolean;
  stopOnError?: boolean;
}

// GET /api/mcp/executions/:id
// Get async execution status

// DELETE /api/mcp/executions/:id
// Cancel async execution
```

### 11.4 Authentication Configuration

```typescript
// ============================================================
// SERVER AUTHENTICATION (References Secret Management Module)
// ============================================================

// PUT /api/mcp/servers/:id/auth
// Configure server authentication
interface ConfigureAuthRequest {
  // Reference to secret in Secret Management Module
  authSecretId?: string;       // Secret ID from /api/secrets
  
  // Authentication type
  authType?: 'BEARER' | 'API_KEY' | 'OAUTH2' | 'BASIC';
  authHeaderName?: string;     // Custom header for API_KEY type
}

// DELETE /api/mcp/servers/:id/auth
// Remove server authentication

// Note: Actual secret management (create, update, delete secrets)
// is handled by the Secret Management Module at /api/secrets/*
// See: Secret Management Module Specification
```

### 11.5 Health & Analytics

```typescript
// ============================================================
// HEALTH
// ============================================================

// GET /api/mcp/health
// Get overall MCP system health
interface SystemHealthResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  servers: Array<{
    serverId: string;
    serverName: string;
    status: HealthStatus;
    lastCheck: Date;
  }>;
  stats: {
    totalServers: number;
    healthyServers: number;
    unhealthyServers: number;
  };
}

// GET /api/mcp/servers/:id/health
// Get specific server health

// POST /api/mcp/servers/:id/health/check
// Trigger immediate health check

// ============================================================
// ANALYTICS
// ============================================================

// GET /api/mcp/analytics/usage
// Get usage analytics
interface UsageAnalyticsParams {
  serverId?: string;
  periodStart: string;       // ISO date
  periodEnd: string;
  granularity: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
}

// GET /api/mcp/analytics/top-servers
// GET /api/mcp/analytics/top-tools
// GET /api/mcp/analytics/top-modules
interface TopNParams {
  period: 'DAY' | 'WEEK' | 'MONTH';
  limit?: number;
}

// GET /api/mcp/analytics/performance
// Get performance metrics

// GET /api/mcp/analytics/errors
// Get error analysis

// ============================================================
// AUDIT
// ============================================================

// GET /api/mcp/audit
// List audit logs
interface AuditLogsParams {
  eventType?: AuditEventType[];
  actorId?: string;
  resourceId?: string;
  outcome?: ('SUCCESS' | 'FAILURE' | 'DENIED')[];
  periodStart?: string;
  periodEnd?: string;
  page?: number;
  limit?: number;
}

// GET /api/mcp/audit/:id
// Get audit log details
```

### 11.6 Endpoint Permission Matrix

| Endpoint | Super Admin | Org Admin | User |
|----------|-------------|-----------|------|
| `GET /api/mcp/catalog` | ✅ | ✅ | ✅ |
| `GET /api/mcp/servers/:id` | ✅ | ✅ | ✅ |
| `POST /api/mcp/servers` | ❌ | ✅ | ❌ |
| `PUT /api/mcp/servers/:id` | ✅ (all) | ✅ (custom) | ❌ |
| `DELETE /api/mcp/servers/:id` | ✅ (all) | ✅ (custom) | ❌ |
| `POST /api/mcp/catalog/servers` | ✅ | ❌ | ❌ |
| `PUT /api/mcp/catalog/servers/:id` | ✅ | ❌ | ❌ |
| `PUT /api/mcp/servers/:id/toggle` | ✅ | ✅ | ❌ |
| `GET /api/mcp/tools` | ✅ | ✅ | ✅ |
| `POST /api/mcp/execute` | ✅ | ✅ | ✅ |
| `PUT /api/mcp/servers/:id/auth` | ✅ | ✅ (custom) | ❌ |
| `GET /api/mcp/analytics/*` | ✅ | ✅ (org scoped) | ❌ |
| `GET /api/mcp/audit` | ✅ | ✅ (org scoped) | ❌ |

---

## 12. UI Views

### 12.1 View Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MCP Server Module UI                               │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     Super Admin Views                                   │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │
│  │  │   Catalog    │  │   Global     │  │   Platform   │  │  System    │ │ │
│  │  │  Management  │  │   Settings   │  │  Analytics   │  │   Audit    │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    Org Admin Views                                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │
│  │  │   Server     │  │    Org       │  │    Usage     │  │   Audit    │ │ │
│  │  │  Management  │  │  Settings    │  │  Analytics   │  │    Logs    │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │ │
│  │  ┌──────────────┐  ┌──────────────┐                                   │ │
│  │  │    Toggle    │  │   Security   │                                   │ │
│  │  │   Controls   │  │   Policies   │                                   │ │
│  │  └──────────────┘  └──────────────┘                                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     User Views                                          │ │
│  │  ┌──────────────┐  ┌──────────────┐                                   │ │
│  │  │   Available  │  │     Tool     │                                   │ │
│  │  │   Servers    │  │   Browser    │                                   │ │
│  │  └──────────────┘  └──────────────┘                                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Super Admin Views

#### 12.2.1 Catalog Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MCP Server Catalog                                        [+ Add Server]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Filters: [Type ▼] [Status ▼] [Category ▼]    Search: [________________]    │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ⭐ filesystem                                              v2.1.0       │ │
│ │    Local filesystem operations                                          │ │
│ │    Type: DEFAULT │ Status: ACTIVE │ Verified ✓                         │ │
│ │    Capabilities: filesystem.local.read, filesystem.local.write, ...    │ │
│ │    [Edit] [Deprecate] [New Version] [Feature ⭐]                       │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ 🔧 github                                                  v1.5.2       │ │
│ │    GitHub API integration                                               │ │
│ │    Type: DEFAULT │ Status: ACTIVE │ Verified ✓ │ Featured              │ │
│ │    Capabilities: communication.github.issues, ...                       │ │
│ │    [Edit] [Deprecate] [New Version] [Unfeature]                        │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ ⚠️ legacy-db-connector                                     v0.9.0       │ │
│ │    Legacy database connector (deprecated)                               │ │
│ │    Type: DEFAULT │ Status: DEPRECATED │ Verified ✓                     │ │
│ │    Replacement: postgres                                                │ │
│ │    [Edit] [Archive]                                                     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                              [1] [2] [3] ... [Next →]                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 12.2.2 Platform Analytics Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Platform MCP Analytics                           Period: [Last 30 Days ▼]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐    │
│ │  1.2M         │ │  98.5%        │ │  142ms        │ │  156          │    │
│ │  Executions   │ │  Success Rate │ │  Avg Latency  │ │  Active Srvrs │    │
│ │  ↑ 12%        │ │  ↑ 0.3%       │ │  ↓ 8ms        │ │  ↑ 3          │    │
│ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘    │
│                                                                              │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────────┐ │
│ │ Executions Over Time            │ │ Top Servers by Usage                │ │
│ │ ┌─────────────────────────────┐ │ │ ┌─────────────────────────────────┐ │ │
│ │ │     📈 [Chart]              │ │ │ │ 1. filesystem      450K  (37%)  │ │ │
│ │ │                             │ │ │ │ 2. github          280K  (23%)  │ │ │
│ │ │                             │ │ │ │ 3. web-fetch       195K  (16%)  │ │ │
│ │ │                             │ │ │ │ 4. postgres        120K  (10%)  │ │ │
│ │ │                             │ │ │ │ 5. code-analyzer    85K   (7%)  │ │ │
│ │ └─────────────────────────────┘ │ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────┘ └─────────────────────────────────────┘ │
│                                                                              │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────────┐ │
│ │ Usage by Organization           │ │ Top Modules                         │ │
│ │ ┌─────────────────────────────┐ │ │ ┌─────────────────────────────────┐ │ │
│ │ │  [Pie Chart]                │ │ │ │ 1. Planning        380K  (32%)  │ │ │
│ │ │                             │ │ │ │ 2. Code Gen        290K  (24%)  │ │ │
│ │ │                             │ │ │ │ 3. Agents          240K  (20%)  │ │ │
│ │ │                             │ │ │ │ 4. Knowledge Base  145K  (12%)  │ │ │
│ │ └─────────────────────────────┘ │ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────┘ └─────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.3 Org Admin Views

#### 12.3.1 Server Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MCP Servers - Acme Corp                              [+ Add Custom Server]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Tabs: [Default Catalog] [Custom Servers] [All]                              │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                          DEFAULT CATALOG                                 │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ ☑ filesystem                    ✅ Healthy      [Configure] [Duplicate] │ │
│ │ ☑ github                        ✅ Healthy      [Configure] [Duplicate] │ │
│ │ ☐ postgres                      ⚪ Disabled     [Enable]    [Duplicate] │ │
│ │ ☑ web-fetch                     ⚠️ Degraded     [Configure] [Duplicate] │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                          CUSTOM SERVERS                                  │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ ☑ acme-internal-api             ✅ Healthy      [Edit] [Configure] [🗑] │ │
│ │ ☑ custom-analytics              ✅ Healthy      [Edit] [Configure] [🗑] │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 12.3.2 Toggle Controls

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Server Access Controls - Acme Corp                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Organization Level                                                          │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ MCP Feature Enabled: [●━━━━━━━━━━━●] ON                                 │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Server: [filesystem ▼]                                                      │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                                                                          │ │
│ │ Organization-wide:  [●━━━━━●] Enabled                                   │ │
│ │                                                                          │ │
│ │ Team Overrides:                                                          │ │
│ │ ┌──────────────────────────────────────────────────────────────────────┐│ │
│ │ │ Frontend Team      [●━━━━━●] Enabled    Priority: [1 ▼]              ││ │
│ │ │ Backend Team       [●━━━━━●] Enabled    Priority: [1 ▼]              ││ │
│ │ │ Security Team      [━━━━━━○] Disabled                                ││ │
│ │ └──────────────────────────────────────────────────────────────────────┘│ │
│ │                                                                          │ │
│ │ Project Overrides:                                                       │ │
│ │ ┌──────────────────────────────────────────────────────────────────────┐│ │
│ │ │ Project Alpha      [●━━━━━●] Enabled    Priority: [2 ▼]              ││ │
│ │ │ Project Beta       [━━━━━━○] Disabled                                ││ │
│ │ └──────────────────────────────────────────────────────────────────────┘│ │
│ │                                                                          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                               [Cancel] [Save Changes]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 12.3.3 Security Policies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Security Policies - Acme Corp                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Tabs: [Sandbox] [Rate Limiting] [Permissions] [Audit]                       │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ SANDBOX CONFIGURATION                                                    │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                          │ │
│ │ Default Sandbox: [●━━━━━●] Enabled                                      │ │
│ │ Allow Server Override: [━━━━━━○] No                                     │ │
│ │                                                                          │ │
│ │ Filesystem Access:                                                       │ │
│ │ ├─ Allowed Paths: [${workspaceFolder}/**                    ] [+ Add]   │ │
│ │ ├─ Denied Paths:  [**/.env*, **/secrets/**                  ] [+ Add]   │ │
│ │ └─ Max File Size: [10    ] MB                                           │ │
│ │                                                                          │ │
│ │ Network Access:                                                          │ │
│ │ ├─ Allow External: [●━━━━━●] Yes                                        │ │
│ │ ├─ Allowed Hosts:  [api.github.com, *.azure.com            ] [+ Add]    │ │
│ │ └─ Require TLS:    [●━━━━━●] Yes                                        │ │
│ │                                                                          │ │
│ │ Process Limits:                                                          │ │
│ │ ├─ Max Concurrent: [5     ]                                             │ │
│ │ └─ Timeout:        [30    ] seconds                                     │ │
│ │                                                                          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                               [Cancel] [Save Policies]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.4 User Views

#### 12.4.1 Available Servers Browser

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Available MCP Servers                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Search: [________________________]  Category: [All ▼]                       │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📁 FILESYSTEM                                                            │ │
│ │ ┌───────────────────────────────────────────────────────────────────┐   │ │
│ │ │ filesystem                                           ✅ Available │   │ │
│ │ │ Local filesystem operations                                       │   │ │
│ │ │ Tools: read_file, write_file, list_directory, search_files, ...  │   │ │
│ │ │                                                      [View Tools] │   │ │
│ │ └───────────────────────────────────────────────────────────────────┘   │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ 🔗 CODE & DEVELOPMENT                                                    │ │
│ │ ┌───────────────────────────────────────────────────────────────────┐   │ │
│ │ │ git                                                  ✅ Available │   │ │
│ │ │ Git version control operations                                    │   │ │
│ │ │ Tools: git_status, git_commit, git_branch, git_diff, ...         │   │ │
│ │ │                                                      [View Tools] │   │ │
│ │ └───────────────────────────────────────────────────────────────────┘   │ │
│ │ ┌───────────────────────────────────────────────────────────────────┐   │ │
│ │ │ github                                               ✅ Available │   │ │
│ │ │ GitHub API integration                                            │   │ │
│ │ │ Tools: create_issue, list_prs, get_repo_info, ...                │   │ │
│ │ │                                                      [View Tools] │   │ │
│ │ └───────────────────────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 12.4.2 Tool Browser

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tool Browser - filesystem                                            [✕]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Search tools: [________________]                                            │
│                                                                              │
│ ┌───────────────────────────────┐ ┌─────────────────────────────────────┐  │
│ │ TOOLS                         │ │ read_file                            │  │
│ │                               │ │                                      │  │
│ │ ► read_file             ◄     │ │ Read the contents of a file from    │  │
│ │   write_file                  │ │ the filesystem.                      │  │
│ │   edit_file                   │ │                                      │  │
│ │   list_directory              │ │ ┌──────────────────────────────────┐│  │
│ │   search_files                │ │ │ Parameters                       ││  │
│ │   get_file_info               │ │ ├──────────────────────────────────┤│  │
│ │   create_directory            │ │ │ path (required)                  ││  │
│ │   delete_file                 │ │ │   Type: string                   ││  │
│ │   move_file                   │ │ │   Path to the file to read       ││  │
│ │   copy_file                   │ │ │                                  ││  │
│ │                               │ │ │ encoding (optional)              ││  │
│ │                               │ │ │   Type: string                   ││  │
│ │                               │ │ │   Default: "utf-8"               ││  │
│ │                               │ │ └──────────────────────────────────┘│  │
│ │                               │ │                                      │  │
│ │                               │ │ Permission Level: STANDARD           │  │
│ │                               │ │ Capabilities: filesystem.local.read  │  │
│ │                               │ │                                      │  │
│ └───────────────────────────────┘ └─────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.5 Component Structure

```
src/renderer/components/mcp/
├── index.ts
├── MCPContext.tsx                   # MCP state management
│
├── catalog/
│   ├── ServerCatalog.tsx            # Main catalog list
│   ├── ServerCard.tsx               # Server card component
│   ├── ServerFilters.tsx            # Filter controls
│   └── AddServerDialog.tsx          # Add server modal
│
├── detail/
│   ├── ServerDetail.tsx             # Server detail view
│   ├── ServerOverview.tsx           # Overview tab
│   ├── ServerTools.tsx              # Tools tab
│   ├── ServerConfig.tsx             # Configuration tab
│   └── ServerHealth.tsx             # Health tab
│
├── tools/
│   ├── ToolBrowser.tsx              # Tool browser dialog
│   ├── ToolList.tsx                 # Tool list
│   ├── ToolDetail.tsx               # Tool detail panel
│   └── ToolSchema.tsx               # Schema visualization
│
├── admin/
│   ├── CatalogManagement.tsx        # Super Admin catalog management
│   ├── ServerEditor.tsx             # Add/edit server form
│   ├── VersionManager.tsx           # Version management
│   └── DeprecateDialog.tsx          # Deprecation flow
│
├── settings/
│   ├── OrgMCPSettings.tsx           # Organization settings
│   ├── ToggleControls.tsx           # Toggle management
│   ├── SecurityPolicies.tsx         # Security policy config
│   ├── SandboxConfig.tsx            # Sandbox settings
│   ├── RateLimitConfig.tsx          # Rate limit settings
│   └── AuthConfig.tsx               # Authentication configuration
│
├── analytics/
│   ├── AnalyticsDashboard.tsx       # Main analytics view
│   ├── UsageChart.tsx               # Usage over time
│   ├── TopServersChart.tsx          # Top servers
│   ├── TopToolsChart.tsx            # Top tools
│   ├── PerformanceMetrics.tsx       # Performance view
│   └── ErrorAnalysis.tsx            # Error analysis
│
├── audit/
│   ├── AuditLogs.tsx                # Audit log list
│   ├── AuditFilters.tsx             # Filter controls
│   └── AuditDetail.tsx              # Log detail view
│
└── common/
    ├── HealthBadge.tsx              # Health status badge
    ├── CapabilityTag.tsx            # Capability tag
    ├── ServerTypeBadge.tsx          # Server type badge
    └── PermissionLevelBadge.tsx     # Permission level badge
```

---

## 13. Configuration Reference

### 13.1 Environment Variables

```bash
# MCP Module Configuration
MCP_ENABLED=true
MCP_DEFAULT_TIMEOUT_MS=30000
MCP_MAX_CONCURRENT_EXECUTIONS=100
MCP_HEALTH_CHECK_INTERVAL_MS=60000

# Local Server Management
MCP_LOCAL_SERVERS_PATH=/opt/mcp-servers
MCP_DOCKER_SOCKET=/var/run/docker.sock
MCP_AUTO_UPDATE_ENABLED=true

# Security
MCP_DEFAULT_SANDBOX_ENABLED=true
MCP_AUDIT_LOG_RETENTION_DAYS=90

# Note: Secret storage configuration is handled by the Secret Management Module
# See: Secret Management Module Specification for vault configuration

# Analytics
MCP_METRICS_RETENTION_DAYS=365
MCP_ANALYTICS_GRANULARITY=HOUR
```

### 13.2 Default Server Configurations

```typescript
// Default configuration for all servers
const defaultServerConfig: ServerConfigDefaults = {
  timeout: 30000,
  retryPolicy: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
  },
  healthCheck: {
    enabled: true,
    intervalMs: 60000,
    timeoutMs: 5000,
    unhealthyThreshold: 3,
    healthyThreshold: 2
  },
  sandbox: {
    enabled: true,
    permissions: {
      filesystem: {
        allowedPaths: ['${workspaceFolder}/**'],
        deniedPaths: ['**/.env*', '**/secrets/**', '**/.git/config'],
        maxFileSize: 10 * 1024 * 1024
      },
      network: {
        allowedHosts: [],
        protocols: ['https']
      },
      process: {
        maxProcesses: 5,
        timeout: 30000
      }
    }
  }
};
```

---

## 14. Implementation Guidelines

### 14.1 Implementation Phases

#### Phase 1: Core Infrastructure (Weeks 1-3)
- [ ] Database schema and migrations
- [ ] Basic server registry implementation
- [ ] Stdio transport implementation
- [ ] HTTP/SSE transport implementation
- [ ] Basic tool execution flow

#### Phase 2: Catalog & Management (Weeks 4-5)
- [ ] Default catalog seeding
- [ ] Super Admin catalog management API
- [ ] Org Admin custom server management API
- [ ] Toggle controls implementation
- [ ] Basic UI for catalog browsing

#### Phase 3: Security & Access Control (Weeks 6-7)
- [ ] Permission scoping implementation
- [ ] Sandbox configuration
- [ ] Rate limiting
- [ ] Audit logging
- [ ] Secret Management Module integration (for authentication)

#### Phase 4: Module Integration (Weeks 8-9)
- [ ] MCPClient interface implementation
- [ ] Capability-based routing
- [ ] Integration with Planning module
- [ ] Integration with Code Generation module
- [ ] Integration with Agent system

#### Phase 5: Health & Analytics (Weeks 10-11)
- [ ] Health monitoring system
- [ ] Usage analytics collection
- [ ] Analytics API endpoints
- [ ] Analytics dashboard UI

#### Phase 6: UI Completion (Weeks 12-13)
- [ ] Super Admin views
- [ ] Org Admin views
- [ ] User views
- [ ] Tool browser
- [ ] Audit log viewer

#### Phase 7: Polish & Testing (Weeks 14-15)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Default catalog population

### 14.2 Key Dependencies

| Dependency | Purpose |
|------------|---------|
| `@modelcontextprotocol/sdk` | MCP protocol implementation |
| `dockerode` | Docker container management |
| `ioredis` | Rate limiting and caching |
| `zod` | Schema validation |
| `recharts` | Analytics charts |
| **Secret Management Module** | Authentication secrets (see separate module) |

### 14.3 Testing Strategy

```typescript
// Unit Tests
describe('MCPRegistry', () => {
  it('should register a server');
  it('should find servers by capability');
  it('should respect organization scope');
  it('should handle server versioning');
});

describe('ExecutionRouter', () => {
  it('should route by capability');
  it('should handle failover');
  it('should respect toggles');
  it('should apply rate limits');
});

describe('SandboxEnforcer', () => {
  it('should validate filesystem access');
  it('should validate network access');
  it('should enforce resource limits');
});

// Integration Tests
describe('MCP Tool Execution', () => {
  it('should execute a stdio-based tool');
  it('should execute an HTTP-based tool');
  it('should handle timeouts');
  it('should log audit events');
});

// E2E Tests
describe('MCP Admin Flow', () => {
  it('Super Admin can manage catalog');
  it('Org Admin can add custom servers');
  it('Org Admin can configure toggles');
  it('User can browse available tools');
});
```

### 14.4 Performance Considerations

1. **Connection Pooling**: Maintain connection pools for HTTP-based servers
2. **Lazy Loading**: Only initialize servers when first requested
3. **Caching**: Cache tool schemas and capability indexes
4. **Batch Operations**: Support batch tool execution for efficiency
5. **Async Processing**: Use worker threads for heavy operations
6. **Metrics Aggregation**: Aggregate metrics in-memory before persisting

### 14.5 Error Handling

```typescript
// MCP-specific error types
class MCPError extends Error {
  constructor(
    message: string,
    public code: MCPErrorCode,
    public details?: unknown
  ) {
    super(message);
  }
}

enum MCPErrorCode {
  SERVER_NOT_FOUND = 'MCP_SERVER_NOT_FOUND',
  TOOL_NOT_FOUND = 'MCP_TOOL_NOT_FOUND',
  CAPABILITY_NOT_AVAILABLE = 'MCP_CAPABILITY_NOT_AVAILABLE',
  SERVER_UNHEALTHY = 'MCP_SERVER_UNHEALTHY',
  EXECUTION_TIMEOUT = 'MCP_EXECUTION_TIMEOUT',
  EXECUTION_FAILED = 'MCP_EXECUTION_FAILED',
  RATE_LIMIT_EXCEEDED = 'MCP_RATE_LIMIT_EXCEEDED',
  PERMISSION_DENIED = 'MCP_PERMISSION_DENIED',
  SANDBOX_VIOLATION = 'MCP_SANDBOX_VIOLATION',
  AUTH_SECRET_NOT_FOUND = 'MCP_AUTH_SECRET_NOT_FOUND',  // Referenced secret doesn't exist in Secret Management Module
  TRANSPORT_ERROR = 'MCP_TRANSPORT_ERROR',
  INVALID_PARAMS = 'MCP_INVALID_PARAMS'
}
```

---

## 15. Summary

The MCP Server Module provides a comprehensive, secure, and scalable infrastructure for managing Model Context Protocol servers within Coder IDE. Key highlights:

1. **Centralized Management**: Single point of control for all MCP servers
2. **Multi-Tenant**: Support for organization-specific configurations and custom servers
3. **Capability-Based**: Intelligent routing based on declared capabilities
4. **Secure by Default**: Sandboxing, rate limiting, and audit logging
5. **Observable**: Health monitoring and usage analytics
6. **Extensible**: Easy integration for new modules and agents

---

**Related Documents:**
- [Part 1: Data Models, Taxonomy, Protocol](./mcp-server-specification-part1.md)
- [Secret Management Module](../Secret%20Management/secret-management-specification-part1.md) - Centralized secret storage for authentication
- [Module List](../Main/module-list.md)
- [Project Description](../Main/project-description.md)

