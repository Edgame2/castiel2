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

