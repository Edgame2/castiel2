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

> **Shared Database**: All MCP Server tables reside in the shared PostgreSQL database (`coder_ide`) alongside other module tables. Tables are prefixed with `mcp_` for logical separation.
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


