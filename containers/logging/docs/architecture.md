# Logging Module - Architecture

Per ModuleImplementationGuide Section 13: Documentation Requirements

## Overview

The Logging module is an enterprise-grade audit logging service designed for compliance (SOC2, GDPR, PCI-DSS) with tamper-evident storage, multi-tenancy, and flexible retention policies.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SYSTEMS                                     │
│                                                                                   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│  │    Auth     │   │    User     │   │   Secret    │   │  Planning   │          │
│  │   Module    │   │   Module    │   │   Module    │   │   Module    │          │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘          │
│         │                 │                 │                 │                   │
│         └─────────────────┴─────────────────┴─────────────────┘                   │
│                                    │                                              │
│                         ┌──────────▼──────────┐                                   │
│                         │     RabbitMQ        │                                   │
│                         │   (coder_events)    │                                   │
│                         └──────────┬──────────┘                                   │
└────────────────────────────────────┼──────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼──────────────────────────────────────────────┐
│                           LOGGING MODULE                                          │
│                                    │                                              │
│  ┌─────────────────────────────────▼─────────────────────────────────────────┐   │
│  │                         EVENT CONSUMER                                      │   │
│  │  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │   │
│  │  │ AuditEvent      │   │   Event         │   │   Rate          │          │   │
│  │  │ Consumer        │───│   Mapper        │───│   Limiter       │          │   │
│  │  └─────────────────┘   └─────────────────┘   └─────────────────┘          │   │
│  └───────────────────────────────────┬───────────────────────────────────────┘   │
│                                      │                                            │
│  ┌───────────────────────────────────▼───────────────────────────────────────┐   │
│  │                         INGESTION LAYER                                    │   │
│  │                                                                            │   │
│  │  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │   │
│  │  │   Ingestion     │───│   Redaction     │───│   Hash Chain    │          │   │
│  │  │   Service       │   │   Utility       │   │   Generator     │          │   │
│  │  └────────┬────────┘   └─────────────────┘   └─────────────────┘          │   │
│  │           │                                                                │   │
│  │           ▼                                                                │   │
│  │  ┌─────────────────┐                                                       │   │
│  │  │   Local Buffer  │  (Resilience for DB failures)                         │   │
│  │  └─────────────────┘                                                       │   │
│  └───────────────────────────────────┬───────────────────────────────────────┘   │
│                                      │                                            │
│  ┌───────────────────────────────────▼───────────────────────────────────────┐   │
│  │                    PROVIDER ABSTRACTION LAYER                              │   │
│  │                                                                            │   │
│  │  ┌───────────────────────────────────────────────────────────────┐        │   │
│  │  │                    IStorageProvider                            │        │   │
│  │  │  store() | storeBatch() | search() | aggregate() | getById() │        │   │
│  │  └───────────────────────────┬───────────────────────────────────┘        │   │
│  │                              │                                             │   │
│  │    ┌─────────────────────────┼─────────────────────────────────┐          │   │
│  │    │                         │                                  │          │   │
│  │    ▼                         ▼                                  ▼          │   │
│  │  ┌─────────────┐   ┌─────────────────┐   ┌─────────────────┐              │   │
│  │  │  Postgres   │   │  Elasticsearch  │   │    Future       │              │   │
│  │  │  Provider   │   │    Provider     │   │   Providers     │              │   │
│  │  │  (Active)   │   │   (Planned)     │   │                 │              │   │
│  │  └─────────────┘   └─────────────────┘   └─────────────────┘              │   │
│  │                                                                            │   │
│  │  ┌───────────────────────────────────────────────────────────────┐        │   │
│  │  │                    IArchiveProvider                            │        │   │
│  │  │           archiveLogs() | retrieveArchive()                   │        │   │
│  │  └───────────────────────────┬───────────────────────────────────┘        │   │
│  │                              │                                             │   │
│  │    ┌─────────────────────────┼─────────────────────────────────┐          │   │
│  │    │                         │                                  │          │   │
│  │    ▼                         ▼                                  ▼          │   │
│  │  ┌─────────────┐   ┌─────────────────┐   ┌─────────────────┐              │   │
│  │  │    Local    │   │       S3        │   │     Azure       │              │   │
│  │  │   Archive   │   │    Archive      │   │     Blob        │              │   │
│  │  └─────────────┘   └─────────────────┘   └─────────────────┘              │   │
│  │                                                                            │   │
│  │  ┌───────────────────────────────────────────────────────────────┐        │   │
│  │  │                      ISIEMProvider                             │        │   │
│  │  │              sendLogs() | healthCheck()                        │        │   │
│  │  └───────────────────────────┬───────────────────────────────────┘        │   │
│  │                              │                                             │   │
│  │    ┌─────────────────────────┼─────────────────────────────────┐          │   │
│  │    │                         │                                  │          │   │
│  │    ▼                         ▼                                  ▼          │   │
│  │  ┌─────────────┐   ┌─────────────────┐   ┌─────────────────┐              │   │
│  │  │   Splunk    │   │    Datadog      │   │    Webhook      │              │   │
│  │  │   Provider  │   │    Provider     │   │    Provider     │              │   │
│  │  └─────────────┘   └─────────────────┘   └─────────────────┘              │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │                           SERVICES LAYER                                   │   │
│  │                                                                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │   │
│  │  │   Query     │  │  Retention  │  │   Export    │  │   Alert     │       │   │
│  │  │   Service   │  │   Service   │  │   Service   │  │   Service   │       │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │   │
│  │                                                                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                        │   │
│  │  │ HashChain   │  │ Verification│  │Configuration│                        │   │
│  │  │  Service    │  │   Service   │  │   Service   │                        │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                        │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │                          BACKGROUND JOBS                                   │   │
│  │                                                                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │   │
│  │  │  Retention  │  │   Archive   │  │    Alert    │  │  Partition  │       │   │
│  │  │    Job      │  │    Job      │  │    Job      │  │    Job      │       │   │
│  │  │  (2 AM)     │  │  (3 AM)     │  │ (Every min) │  │  (Monthly)  │       │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │                            API LAYER                                       │   │
│  │                                                                            │   │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │   │
│  │  │                     Fastify Server (Port 3014)                       │ │   │
│  │  └──────────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                            │   │
│  │  Middleware: JWT Auth │ RBAC │ Rate Limit │ Audit Access │ Error Handler  │   │
│  │                                                                            │   │
│  │  Routes:                                                                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │   │
│  │  │  /logs  │ │ /search │ │ /export │ │/policies│ │ /alerts │ │/verify  │ │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │   │
│  │                                                                            │   │
│  │  Health: /health │ /ready                                                  │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │                          DATABASE LAYER                                    │   │
│  │                                                                            │   │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │   │
│  │  │              Azure Cosmos DB NoSQL (shared database)                  │ │   │
│  │  │                                                                       │ │   │
│  │  │  Containers:                                                          │ │   │
│  │  │  • audit_logs (partitioned by tenantId, TTL: 1 year)                │ │   │
│  │  │  • audit_retention_policies (partitioned by tenantId)                │ │   │
│  │  │  • audit_alert_rules (partitioned by tenantId)                       │ │   │
│  │  │  • audit_hash_checkpoints (partitioned by tenantId)                   │ │   │
│  │  │  • audit_configurations (partitioned by tenantId)                    │ │   │
│  │  │  • audit_exports (partitioned by tenantId)                           │ │   │
│  │  └──────────────────────────────────────────────────────────────────────┘ │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                          EVENT PUBLISHING                                          │
│                                                                                    │
│  ┌─────────────────┐   ┌─────────────────┐                                        │
│  │audit.alert      │   │audit.verification│                                       │
│  │.triggered       │   │.failed           │                                       │
│  └────────┬────────┘   └────────┬─────────┘                                       │
│           │                     │                                                  │
│           └──────────┬──────────┘                                                  │
│                      ▼                                                             │
│           ┌─────────────────┐                                                      │
│           │   Notification  │                                                      │
│           │     Module      │                                                      │
│           └─────────────────┘                                                      │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Design Decisions

### 1. Provider Abstraction Pattern

**Decision**: Use provider interfaces for all external integrations.

**Rationale**:
- Allows swapping storage backends without code changes
- Enables testing with mock providers
- Future-proofs for Elasticsearch, ClickHouse, etc.

**Implementation**:
- `IStorageProvider` - Primary log storage
- `IArchiveProvider` - Cold storage archival
- `ISIEMProvider` - Security monitoring integration

### 2. Hash Chain for Tamper Evidence

**Decision**: Implement SHA-256 hash chain across all logs.

**Rationale**:
- Compliance requirement (SOC2, PCI-DSS)
- Detects unauthorized modifications
- Provides cryptographic proof of log integrity

**Implementation**:
```
log[n].hash = SHA256(
  log[n].id +
  log[n].timestamp +
  log[n].action +
  log[n].message +
  log[n-1].hash  // Previous log's hash
)
```

### 3. Multi-Tenancy with Organization Isolation

**Decision**: Strict organization-based data isolation at the database level.

**Rationale**:
- GDPR/compliance requirement
- Prevents data leakage between tenants
- Enables organization-specific configurations

**Implementation**:
- All queries include `tenantId` filter (partition key)
- Super Admin can view across organizations (with explicit permission)
- Cosmos DB partitioning by `tenantId` for efficient isolation

### 4. Event-Driven Ingestion

**Decision**: Support both synchronous API and async RabbitMQ ingestion.

**Rationale**:
- Decouples modules (no direct dependencies)
- Handles high-volume log streams
- Provides backpressure handling

**Flow**:
1. Other modules publish events to `coder_events` exchange
2. Logging module consumes via dedicated queue
3. Events are mapped to audit log format
4. Logs are batched and stored

### 5. Local Buffering for Resilience

**Decision**: Buffer logs locally when database is unavailable.

**Rationale**:
- Ensures no logs are lost during outages
- At-least-once delivery guarantee
- Automatic recovery when DB comes back

**Implementation**:
```typescript
// If DB write fails, buffer locally
try {
  await storageProvider.store(log);
} catch (error) {
  await localBuffer.add(log);
  // Background job will retry
}
```

### 9. Cosmos DB NoSQL Migration

**Decision**: Migrate from PostgreSQL to Azure Cosmos DB NoSQL.

**Rationale**:
- Aligns with system-wide database architecture
- Shared database with prefixed containers
- Better scalability and global distribution
- TTL support for automatic log expiration

**Implementation**:
- Container: `audit_logs` (partitioned by `/tenantId`)
- TTL: 1 year default (configurable per organization)
- Composite indexes for common query patterns
- Direct Cosmos DB SDK usage (no ORM)

### 6. Configurable Data Redaction

**Decision**: Automatic redaction of sensitive data before storage.

**Rationale**:
- PCI-DSS compliance (no card numbers in logs)
- GDPR (minimize personal data)
- Prevent credential leakage

**Implementation**:
- Configurable regex patterns per organization
- Default patterns for common sensitive data
- Redaction applied before hash calculation

### 7. Hierarchical Retention Policies

**Decision**: Support retention policies at multiple levels.

**Rationale**:
- Different data types have different compliance requirements
- Organizations may have specific needs
- Flexible without being overwhelming

**Hierarchy**:
1. **Global defaults** (from config file)
2. **Organization overrides**
3. **Category-specific policies**
4. **Severity-specific policies**

### 8. Export with Progress Tracking

**Decision**: Implement async export jobs with progress tracking.

**Rationale**:
- Large exports can take minutes/hours
- Users need visibility into progress
- Background processing doesn't block API

**Implementation**:
1. POST `/export` creates job (returns 202)
2. Job processes in background
3. GET `/export/:id` returns progress (0-100%)
4. GET `/export/:id/download` returns file when ready

---

## Data Flow

### Log Ingestion Flow

```
1. Event arrives (API or RabbitMQ)
        │
        ▼
2. Rate limit check
        │
        ▼
3. Validate input (Zod schema)
        │
        ▼
4. Get organization config
        │
        ▼
5. Apply redaction (if enabled)
        │
        ▼
6. Generate hash chain
        │
        ▼
7. Store in PostgreSQL
        │
        ▼
8. Forward to SIEM (if enabled)
        │
        ▼
9. Return success
```

### Query Flow

```
1. Request arrives with JWT
        │
        ▼
2. Extract organizationId from JWT
        │
        ▼
3. Check RBAC permissions
        │
        ▼
4. Add organizationId filter (isolation)
        │
        ▼
5. Execute query via storage provider
        │
        ▼
6. Log the access (meta-auditing)
        │
        ▼
7. Return results
```

---

## Security Architecture

### Authentication

- JWT tokens required on all endpoints (except health)
- Token contains: `userId`, `organizationId`, `roles`, `permissions`
- Tokens validated via shared JWT middleware

### Authorization (RBAC)

| Permission | Description |
|------------|-------------|
| `audit.logs.read` | View logs in own organization |
| `audit.logs.read_all` | View logs across all organizations (Super Admin) |
| `audit.logs.ingest` | Create log entries |
| `audit.config.read` | View organization config |
| `audit.config.write` | Modify organization config |
| `audit.policies.read` | View retention policies |
| `audit.policies.write` | Manage retention policies |
| `audit.alerts.read` | View alert rules |
| `audit.alerts.write` | Manage alert rules |
| `audit.export.create` | Create export jobs |
| `audit.export.download` | Download exports |
| `audit.verification.run` | Run hash verification |
| `audit.checkpoint.create` | Create verification checkpoints |

### Data Protection

- Sensitive data redaction before storage
- No raw credentials in logs
- Encryption in transit (HTTPS)
- Database encryption at rest (recommended)

---

## Performance Considerations

### Batching

- API supports batch ingestion (up to 1000 logs)
- Internal batching with configurable flush interval
- Reduces database round trips

### Partitioning

- Cosmos DB partitioning by `/tenantId` (partition key)
- Efficient tenant isolation at database level
- Automatic scaling based on RU configuration

### Indexing

Cosmos DB composite indexes for common query patterns:

```json
{
  "compositeIndexes": [
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/timestamp", "order": "descending" }
    ],
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/action", "order": "ascending" },
      { "path": "/timestamp", "order": "descending" }
    ],
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/userId", "order": "ascending" },
      { "path": "/timestamp", "order": "descending" }
    ]
  ]
}
```

Full-text search: Use Azure Cognitive Search or Elasticsearch integration (future).

### Caching

- Organization config cached in memory (TTL: 5 minutes)
- Hot queries can leverage connection pooling
- Redis caching (future enhancement)

---

## Scalability

### Horizontal Scaling

- Stateless service design
- Multiple instances behind load balancer
- Shared database and message queue

### Vertical Scaling

- Configurable batch sizes
- Connection pool tuning
- Database partition pruning

### Future Enhancements

- Elasticsearch for search-heavy workloads
- ClickHouse for analytics
- Read replicas for query distribution
- Sharding by organization

---

## Related Documentation

- [OpenAPI Specification](./openapi.yaml)
- [Logs Events](./logs-events.md)
- [Notifications Events](./notifications-events.md)
- [ModuleImplementationGuide](../../../documentation/global/ModuleImplementationGuide.md)

---

*Document Version: 1.0*  
*Last Updated: 2026-01-22*



