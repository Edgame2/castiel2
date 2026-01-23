# c_integrationSync

## Overview

The `c_integrationSync` ShardType records the history of sync operations for an integration. Each sync job creates a new `c_integrationSync` record capturing the outcome, statistics, and any errors.

> **Scope**: Tenant-specific  
> **Created By**: Sync Engine (automated)  
> **Purpose**: Audit trail and troubleshooting

---

## Schema

### Base Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Auto-generated sync identifier |
| `shardTypeId` | string | ✅ | Always `c_integrationSync` |

### Structured Data

```typescript
interface IntegrationSyncStructuredData {
  // === IDENTITY ===
  integrationId: string;                // Reference to c_integration
  integrationName: string;              // Denormalized for quick display
  providerName: string;
  
  // === JOB INFO ===
  jobId: string;                        // Unique job identifier
  jobType: SyncJobType;
  trigger: SyncTrigger;
  triggeredBy?: string;                 // User ID if manual
  
  // === TIMING ===
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  
  // === STATUS ===
  status: SyncStatus;
  statusMessage?: string;
  
  // === STATISTICS ===
  stats: SyncStats;
  
  // === ENTITY BREAKDOWN ===
  entityStats?: EntitySyncStats[];
  
  // === ERRORS ===
  errors?: SyncError[];
  
  // === SYNC DETAILS ===
  syncDetails?: SyncDetails;
}

// === SUPPORTING TYPES ===

type SyncJobType = 
  | 'full'           // Full sync of all records
  | 'incremental'    // Changes since last sync
  | 'webhook'        // Single record from webhook
  | 'manual';        // User-triggered sync

type SyncTrigger = 
  | 'scheduled'      // Timer-based
  | 'webhook'        // External webhook
  | 'manual'         // User action
  | 'retry';         // Retry of failed job

type SyncStatus = 
  | 'running'        // In progress
  | 'success'        // Completed successfully
  | 'partial'        // Completed with some failures
  | 'failed'         // Failed completely
  | 'cancelled';     // Cancelled by user/system

interface SyncStats {
  // Inbound (External → Castiel)
  recordsFetched: number;
  shardsCreated: number;
  shardsUpdated: number;
  shardsSkipped: number;
  shardsFailed: number;
  
  // Outbound (Castiel → External)
  recordsPushed?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsDeleted?: number;
  recordsFailed?: number;
}

interface EntitySyncStats {
  externalEntity: string;              // "Account"
  shardTypeId: string;                 // "c_company"
  direction: 'inbound' | 'outbound';
  
  fetched?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  
  errors?: SyncError[];
}

interface SyncError {
  code: string;
  message: string;
  entity?: string;
  recordId?: string;
  shardId?: string;
  field?: string;
  timestamp: string;
  retryable: boolean;
}

interface SyncDetails {
  // Query used
  query?: string;
  
  // Pagination
  pagesProcessed?: number;
  
  // Filters applied
  filtersApplied?: string[];
  
  // Date range
  syncFromDate?: string;
  syncToDate?: string;
}
```

---

## Example Instance

### Successful Sync

```json
{
  "id": "sync_20251130_100000_abc",
  "tenantId": "tenant_acme123",
  "shardTypeId": "c_integrationSync",
  "name": "Sync 2025-11-30 10:00:00",
  
  "structuredData": {
    "integrationId": "int_acme_salesforce",
    "integrationName": "Acme Salesforce",
    "providerName": "salesforce",
    
    "jobId": "job_xyz789",
    "jobType": "incremental",
    "trigger": "scheduled",
    
    "startedAt": "2025-11-30T10:00:00Z",
    "completedAt": "2025-11-30T10:02:30Z",
    "durationMs": 150000,
    
    "status": "success",
    "statusMessage": "Sync completed successfully",
    
    "stats": {
      "recordsFetched": 150,
      "shardsCreated": 10,
      "shardsUpdated": 135,
      "shardsSkipped": 5,
      "shardsFailed": 0
    },
    
    "entityStats": [
      {
        "externalEntity": "Account",
        "shardTypeId": "c_company",
        "direction": "inbound",
        "fetched": 50,
        "created": 3,
        "updated": 45,
        "skipped": 2,
        "failed": 0
      },
      {
        "externalEntity": "Contact",
        "shardTypeId": "c_contact",
        "direction": "inbound",
        "fetched": 100,
        "created": 7,
        "updated": 90,
        "skipped": 3,
        "failed": 0
      }
    ],
    
    "syncDetails": {
      "query": "SELECT Id, Name, ... FROM Account WHERE LastModifiedDate > 2025-11-30T09:45:00Z",
      "pagesProcessed": 2,
      "filtersApplied": ["Type = 'Customer'"],
      "syncFromDate": "2025-11-30T09:45:00Z",
      "syncToDate": "2025-11-30T10:00:00Z"
    }
  },
  
  "relationships": [
    {
      "type": "sync_of",
      "targetId": "int_acme_salesforce",
      "targetType": "c_integration"
    }
  ],
  
  "createdAt": "2025-11-30T10:02:30Z",
  "createdBy": "system"
}
```

### Partial Failure

```json
{
  "id": "sync_20251130_110000_def",
  "tenantId": "tenant_acme123",
  "shardTypeId": "c_integrationSync",
  "name": "Sync 2025-11-30 11:00:00",
  
  "structuredData": {
    "integrationId": "int_acme_salesforce",
    "integrationName": "Acme Salesforce",
    "providerName": "salesforce",
    
    "jobId": "job_abc123",
    "jobType": "incremental",
    "trigger": "scheduled",
    
    "startedAt": "2025-11-30T11:00:00Z",
    "completedAt": "2025-11-30T11:03:00Z",
    "durationMs": 180000,
    
    "status": "partial",
    "statusMessage": "Sync completed with 3 failures",
    
    "stats": {
      "recordsFetched": 100,
      "shardsCreated": 5,
      "shardsUpdated": 92,
      "shardsSkipped": 0,
      "shardsFailed": 3
    },
    
    "errors": [
      {
        "code": "VALIDATION_ERROR",
        "message": "Required field 'name' is missing",
        "entity": "Account",
        "recordId": "001xxx001",
        "field": "Name",
        "timestamp": "2025-11-30T11:01:30Z",
        "retryable": false
      },
      {
        "code": "DUPLICATE_EXTERNAL_ID",
        "message": "Record with this external ID already exists",
        "entity": "Contact",
        "recordId": "003xxx002",
        "timestamp": "2025-11-30T11:02:00Z",
        "retryable": false
      },
      {
        "code": "RATE_LIMIT",
        "message": "API rate limit exceeded",
        "timestamp": "2025-11-30T11:02:45Z",
        "retryable": true
      }
    ]
  }
}
```

### Failed Sync

```json
{
  "id": "sync_20251130_120000_ghi",
  "tenantId": "tenant_acme123",
  "shardTypeId": "c_integrationSync",
  "name": "Sync 2025-11-30 12:00:00",
  
  "structuredData": {
    "integrationId": "int_acme_salesforce",
    "integrationName": "Acme Salesforce",
    "providerName": "salesforce",
    
    "jobId": "job_def456",
    "jobType": "incremental",
    "trigger": "scheduled",
    
    "startedAt": "2025-11-30T12:00:00Z",
    "completedAt": "2025-11-30T12:00:05Z",
    "durationMs": 5000,
    
    "status": "failed",
    "statusMessage": "Authentication failed - token expired",
    
    "stats": {
      "recordsFetched": 0,
      "shardsCreated": 0,
      "shardsUpdated": 0,
      "shardsSkipped": 0,
      "shardsFailed": 0
    },
    
    "errors": [
      {
        "code": "AUTHENTICATION_FAILED",
        "message": "Invalid session ID. Session has expired or is invalid.",
        "timestamp": "2025-11-30T12:00:05Z",
        "retryable": false
      }
    ]
  }
}
```

---

## Relationships

```
c_integration (Tenant)
│
└── has_history ──► c_integrationSync[] (Tenant)
                    Each sync creates a history record
```

---

## Querying Sync History

### Get Recent Syncs

```typescript
GET /api/shards?shardTypeId=c_integrationSync&integrationId={id}&limit=20&orderBy=startedAt:desc
```

### Get Failed Syncs

```typescript
GET /api/shards?shardTypeId=c_integrationSync&structuredData.status=failed&limit=50
```

### Get Sync Statistics (Aggregation)

```typescript
// Custom endpoint
GET /api/integrations/{id}/sync-stats?period=7d
```

---

## Retention

Sync history is retained based on tenant configuration:

| Plan | Retention |
|------|-----------|
| Free | 7 days |
| Pro | 30 days |
| Enterprise | 90 days |

Old records are automatically purged by a background job.

---

## Permissions

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| System | ✅ | ✅ | ✅ | ✅ |
| Super Admin | ❌ | ✅ | ❌ | ✅ |
| Tenant Admin | ❌ | ✅ | ❌ | ❌ |
| User | ❌ | ✅ (own tenant) | ❌ | ❌ |

---

## Related Documentation

- [Integrations Overview](../../integrations/README.md)
- [Sync Engine](../../integrations/SYNC-ENGINE.md)
- [c_integration](./c_integration.md)

---

**Last Updated**: November 2025  
**Version**: 1.0.0






