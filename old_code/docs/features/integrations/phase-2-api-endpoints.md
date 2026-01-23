# Phase 2 Integration - API Endpoints Reference

**Date:** Implementation Complete  
**Status:** ✅ **ALL API ENDPOINTS IMPLEMENTED**

---

## 📋 API Endpoints Overview

Phase 2 Integration provides the following API endpoints for managing redaction policies, querying audit trails, and accessing metrics.

---

## 🔒 Redaction Configuration API

**Base Path:** `/api/v1/redaction`

### GET /api/v1/redaction/config
Get redaction configuration for current tenant.

**Authentication:** Required  
**Authorization:** Any authenticated user

**Response:**
```json
{
  "enabled": true,
  "fields": ["structuredData.email", "structuredData.phone"],
  "redactionValue": "[REDACTED]",
  "updatedAt": "2024-01-15T10:30:00Z",
  "updatedBy": "user-123"
}
```

**Example:**
```bash
curl -X GET https://api.example.com/api/v1/redaction/config \
  -H "Authorization: Bearer <token>"
```

---

### PUT /api/v1/redaction/config
Configure redaction for current tenant.

**Authentication:** Required  
**Authorization:** tenant-admin or super-admin

**Request Body:**
```json
{
  "fields": ["structuredData.email", "structuredData.phone", "structuredData.ssn"],
  "redactionValue": "[REDACTED]"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Redaction configuration updated successfully"
}
```

**Example:**
```bash
curl -X PUT https://api.example.com/api/v1/redaction/config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": ["structuredData.email", "structuredData.phone"],
    "redactionValue": "[REDACTED]"
  }'
```

---

### DELETE /api/v1/redaction/config
Disable redaction for current tenant.

**Authentication:** Required  
**Authorization:** tenant-admin or super-admin

**Response:**
```json
{
  "success": true,
  "message": "Redaction disabled successfully"
}
```

**Example:**
```bash
curl -X DELETE https://api.example.com/api/v1/redaction/config \
  -H "Authorization: Bearer <token>"
```

---

## 📝 Phase 2 Audit Trail API

**Base Path:** `/api/v1/audit-trail`

### GET /api/v1/audit-trail
Query audit logs for shards.

**Authentication:** Required  
**Authorization:** tenant-admin or super-admin

**Query Parameters:**
- `targetShardId` (optional): Filter by target shard ID
- `eventType` (optional): Filter by event type (`create`, `update`, `delete`, `read`, `redacted_access`, `relationship_add`, `relationship_remove`)
- `userId` (optional): Filter by user ID
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)
- `limit` (optional): Maximum number of results (default: 100)

**Response:**
```json
{
  "logs": [
    {
      "id": "audit-log-123",
      "eventType": "update",
      "targetShardId": "shard-456",
      "targetShardTypeId": "c_opportunity",
      "userId": "user-789",
      "action": "shard_updated",
      "changes": [
        {
          "field": "structuredData.amount",
          "oldValue": 10000,
          "newValue": 15000
        }
      ],
      "metadata": {
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0..."
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

**Example:**
```bash
curl -X GET "https://api.example.com/api/v1/audit-trail?targetShardId=shard-456&eventType=update&limit=50" \
  -H "Authorization: Bearer <token>"
```

---

### GET /api/v1/audit-trail/shard/:shardId
Get audit logs for a specific shard.

**Authentication:** Required  
**Authorization:** tenant-admin or super-admin

**Path Parameters:**
- `shardId` (required): Shard ID

**Query Parameters:**
- `eventType` (optional): Filter by event type
- `userId` (optional): Filter by user ID
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)
- `limit` (optional): Maximum number of results (default: 100)

**Response:**
```json
{
  "shardId": "shard-456",
  "logs": [
    {
      "id": "audit-log-123",
      "eventType": "create",
      "targetShardId": "shard-456",
      "targetShardTypeId": "c_opportunity",
      "userId": "user-789",
      "action": "shard_created",
      "changes": null,
      "metadata": null,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "count": 1
}
```

**Example:**
```bash
curl -X GET "https://api.example.com/api/v1/audit-trail/shard/shard-456?eventType=update" \
  -H "Authorization: Bearer <token>"
```

---

## 📊 Phase 2 Metrics API

**Base Path:** `/api/v1/metrics`

### GET /api/v1/metrics
Query metrics for a time period.

**Authentication:** Required  
**Authorization:** tenant-admin or super-admin

**Query Parameters:**
- `metricType` (optional): Filter by metric type (`ingestion_lag`, `change_miss_rate`, `vector_hit_ratio`, `insight_confidence_drift`)
- `startDate` (required): Start date (ISO 8601)
- `endDate` (required): End date (ISO 8601)
- `period` (optional): Filter by period (`minute`, `hour`, `day`)
- `limit` (optional): Maximum number of results (default: 1000)

**Response:**
```json
{
  "metrics": [
    {
      "id": "metric-123",
      "metricType": "vector_hit_ratio",
      "value": 0.85,
      "timestamp": "2024-01-15T10:00:00Z",
      "period": "hour",
      "metadata": {
        "unit": "ratio"
      },
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "count": 1
}
```

**Example:**
```bash
curl -X GET "https://api.example.com/api/v1/metrics?metricType=vector_hit_ratio&startDate=2024-01-15T00:00:00Z&endDate=2024-01-15T23:59:59Z" \
  -H "Authorization: Bearer <token>"
```

---

### GET /api/v1/metrics/aggregated
Get aggregated metrics (P50, P95, P99) for a time period.

**Authentication:** Required  
**Authorization:** tenant-admin or super-admin

**Query Parameters:**
- `metricType` (required): Metric type (`ingestion_lag`, `change_miss_rate`, `vector_hit_ratio`, `insight_confidence_drift`)
- `startDate` (required): Start date (ISO 8601)
- `endDate` (required): End date (ISO 8601)

**Response:**
```json
{
  "metricType": "vector_hit_ratio",
  "p50": 0.85,
  "p95": 0.92,
  "p99": 0.95,
  "mean": 0.84,
  "min": 0.65,
  "max": 0.98,
  "count": 100
}
```

**Example:**
```bash
curl -X GET "https://api.example.com/api/v1/metrics/aggregated?metricType=vector_hit_ratio&startDate=2024-01-15T00:00:00Z&endDate=2024-01-15T23:59:59Z" \
  -H "Authorization: Bearer <token>"
```

---

## 🔗 Project Resolver API (Phase 2)

**Base Path:** `/api/v1/projects`

### GET /api/v1/projects/:id/context
Resolve project context - returns scoped shard set via relationship traversal.

**Authentication:** Required  
**Authorization:** Any authenticated user with project access

**Path Parameters:**
- `id` (required): Project ID (shard ID of type `c_project`)

**Query Parameters:**
- `includeExternal` (optional): Include external relationships (default: false)
- `maxDepth` (optional): Maximum traversal depth (default: 3)
- `confidenceThreshold` (optional): Minimum confidence score (default: 0.6)
- `limit` (optional): Maximum number of shards (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "project": {
    "id": "project-123",
    "shardTypeId": "c_project",
    "structuredData": { ... }
  },
  "linkedShards": [
    {
      "id": "shard-456",
      "shardTypeId": "c_opportunity",
      "structuredData": { ... }
    }
  ],
  "totalCount": 1,
  "hasMore": false
}
```

---

### PATCH /api/v1/projects/:id/internal-relationships
Add internal relationships to a project.

**Authentication:** Required  
**Authorization:** Any authenticated user with project write access

**Request Body:**
```json
{
  "relationships": [
    {
      "targetShardId": "shard-456",
      "relationshipType": "includes",
      "label": "Related Opportunity",
      "metadata": {
        "confidence": 0.9,
        "source": "crm"
      }
    }
  ]
}
```

---

### PATCH /api/v1/projects/:id/external-relationships
Add external relationships to a project.

**Authentication:** Required  
**Authorization:** Any authenticated user with project write access

**Request Body:**
```json
{
  "relationships": [
    {
      "system": "salesforce",
      "systemType": "crm",
      "externalId": "sf-opportunity-123",
      "label": "Salesforce Opportunity",
      "syncStatus": "synced",
      "syncDirection": "inbound"
    }
  ]
}
```

---

### GET /api/v1/projects/:id/insights
Get insights with provenance for a project.

**Authentication:** Required  
**Authorization:** Any authenticated user with project access

**Response:**
```json
{
  "insights": [
    {
      "id": "insight-123",
      "shardTypeId": "c_insight_kpi",
      "structuredData": {
        "kpiName": "Total Pipeline Value",
        "value": 500000,
        "trend": "up",
        "period": "monthly"
      },
      "provenance": [
        {
          "targetShardId": "opportunity-1",
          "relationshipType": "derived_from"
        }
      ]
    }
  ],
  "count": 1
}
```

---

## 🔐 Authentication & Authorization

All endpoints require:
- **Authentication:** Valid JWT token in `Authorization: Bearer <token>` header
- **Authorization:** 
  - Redaction config: tenant-admin or super-admin
  - Audit trail: tenant-admin or super-admin
  - Metrics: tenant-admin or super-admin
  - Project resolver: Project access permissions

---

## 📝 Error Responses

All endpoints return standard error responses:

**401 Unauthorized:**
```json
{
  "error": "Unauthorized: Missing tenant context"
}
```

**403 Forbidden:**
```json
{
  "error": "Forbidden: Insufficient permissions"
}
```

**400 Bad Request:**
```json
{
  "error": "Fields must be an array of strings"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to query audit logs"
}
```

---

## 🎯 Usage Examples

### Complete Workflow: Configure Redaction and Query Audit Trail

```bash
# 1. Configure redaction
curl -X PUT https://api.example.com/api/v1/redaction/config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": ["structuredData.email", "structuredData.phone"],
    "redactionValue": "[REDACTED]"
  }'

# 2. Create/update a shard (redaction applied automatically)
curl -X POST https://api.example.com/api/v1/shards \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ ... }'

# 3. Query audit trail for the shard
curl -X GET "https://api.example.com/api/v1/audit-trail/shard/shard-123" \
  -H "Authorization: Bearer <token>"

# 4. Query metrics
curl -X GET "https://api.example.com/api/v1/metrics?metricType=vector_hit_ratio&startDate=2024-01-15T00:00:00Z&endDate=2024-01-15T23:59:59Z" \
  -H "Authorization: Bearer <token>"
```

---

## 📚 Related Documentation

- [Phase 2 Implementation Summary](./phase-2-final-summary.md)
- [Phase 2 Integration Status](./phase-2-integration-status.md)
- [Phase 2 Verification Checklist](./phase-2-verification-checklist.md)
- [Phase 2 Known Limitations](./phase-2-known-limitations.md)

---

**Status:** ✅ **ALL API ENDPOINTS IMPLEMENTED AND DOCUMENTED**






