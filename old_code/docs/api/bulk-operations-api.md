# Bulk Document Operations API Documentation

**Version**: 1.0  
**Last Updated**: December 12, 2025  
**Status**: Stable

## Overview

The Bulk Document Operations API provides asynchronous endpoints for processing large batches of document operations. Operations are processed in the background with real-time status tracking.

## Features

- **Asynchronous Processing**: Operations return immediately with a job ID
- **Progress Tracking**: Monitor job status and progress in real-time
- **Error Resilience**: Individual item failures don't fail the entire job
- **Cancellation**: Cancel pending or in-progress jobs
- **Pagination**: Retrieve results in pages
- **Audit Integration**: All operations logged for compliance
- **Webhook Support**: Notifications on job completion

## Base URL

```
https://api.example.com/api/v1
```

## Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <JWT_TOKEN>
```

### Required Scopes

- `documents:bulk-upload` - For bulk upload operations
- `documents:bulk-delete` - For bulk delete operations
- `documents:bulk-update` - For bulk update operations
- `collections:assign` - For bulk collection assignment

## Data Models

### BulkJob Response

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PROCESSING",
  "jobType": "bulk_upload",
  "totalItems": 100,
  "processedItems": 45,
  "successCount": 40,
  "failureCount": 5,
  "progress": 45,
  "createdAt": "2025-12-12T10:00:00Z",
  "startedAt": "2025-12-12T10:00:05Z",
  "completedAt": null,
  "errorMessage": null
}
```

### BulkJobItemResult

```json
{
  "itemIndex": 0,
  "status": "success|failure",
  "documentId": "doc-uuid-123",
  "error": null,
  "message": null
}
```

### Status Enum

- `PENDING` - Waiting to be processed
- `PROCESSING` - Currently being processed
- `COMPLETED` - Finished successfully
- `FAILED` - Job failed with critical error
- `CANCELLED` - Cancelled by user

### JobType Enum

- `bulk_upload` - Bulk document upload
- `bulk_delete` - Bulk document deletion
- `bulk_update` - Bulk document metadata update
- `bulk_collection_assign` - Bulk collection assignment

## Endpoints

### 1. Bulk Upload

**POST** `/documents/bulk-upload`

Upload multiple documents in a single batch operation.

#### Request

```json
{
  "items": [
    {
      "name": "document1.pdf",
      "fileSize": 1024000,
      "mimeType": "application/pdf",
      "storagePath": "uploads/doc1.pdf",
      "category": "legal",
      "tags": ["contract", "2025"],
      "visibility": "public"
    },
    {
      "name": "document2.docx",
      "fileSize": 512000,
      "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "storagePath": "uploads/doc2.docx",
      "visibility": "internal"
    }
  ]
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| items | array | Yes | Array of documents to upload (max 1000) |
| items[].name | string | Yes | Document filename |
| items[].fileSize | number | Yes | File size in bytes |
| items[].mimeType | string | Yes | MIME type (e.g., application/pdf) |
| items[].storagePath | string | Yes | Path where file is stored |
| items[].category | string | No | Document category |
| items[].tags | array | No | Document tags (max 10) |
| items[].visibility | string | Yes | Visibility level: `public`, `internal`, `confidential` |

#### Response (202 Accepted)

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "totalItems": 2,
  "processedItems": 0,
  "progress": 0
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Items array exceeds maximum of 1000 items"
}
```

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Missing or invalid authentication token"
}
```

---

### 2. Bulk Delete

**POST** `/documents/bulk-delete`

Delete multiple documents in a single batch operation.

#### Request

```json
{
  "documentIds": [
    "doc-uuid-1",
    "doc-uuid-2",
    "doc-uuid-3"
  ],
  "hardDelete": false,
  "reason": "Archive cleanup"
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| documentIds | array | Yes | Array of document IDs to delete (max 1000) |
| hardDelete | boolean | No | Permanently delete (default: soft delete) |
| reason | string | No | Reason for deletion (audit trail) |

#### Response (202 Accepted)

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440001",
  "status": "PENDING",
  "totalItems": 3,
  "processedItems": 0,
  "progress": 0
}
```

---

### 3. Bulk Update

**POST** `/documents/bulk-update`

Update metadata for multiple documents in a single batch operation.

#### Request

```json
{
  "updates": [
    {
      "documentId": "doc-uuid-1",
      "metadata": {
        "category": "archived",
        "tags": ["old", "2024"],
        "visibility": "confidential"
      }
    },
    {
      "documentId": "doc-uuid-2",
      "metadata": {
        "category": "active",
        "tags": ["new", "2025"]
      }
    }
  ]
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| updates | array | Yes | Array of updates (max 1000) |
| updates[].documentId | string | Yes | Document ID to update |
| updates[].metadata | object | Yes | Metadata fields to update |

#### Response (202 Accepted)

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440002",
  "status": "PENDING",
  "totalItems": 2,
  "processedItems": 0,
  "progress": 0
}
```

---

### 4. Bulk Collection Assignment

**POST** `/collections/{collectionId}/bulk-assign`

Assign multiple documents to a collection in a single batch operation.

#### Request

```json
{
  "documentIds": [
    "doc-uuid-1",
    "doc-uuid-2",
    "doc-uuid-3"
  ]
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| collectionId | string (URL) | Yes | Target collection ID |
| documentIds | array | Yes | Array of document IDs (max 1000) |

#### Response (202 Accepted)

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440003",
  "status": "PENDING",
  "totalItems": 3,
  "processedItems": 0,
  "progress": 0
}
```

---

### 5. Get Job Status

**GET** `/bulk-jobs/{jobId}`

Retrieve current status and progress of a bulk job.

#### Request

```
GET /bulk-jobs/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <TOKEN>
```

#### Response (200 OK)

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PROCESSING",
  "jobType": "bulk_upload",
  "totalItems": 100,
  "processedItems": 45,
  "successCount": 40,
  "failureCount": 5,
  "progress": 45,
  "createdAt": "2025-12-12T10:00:00Z",
  "startedAt": "2025-12-12T10:00:05Z",
  "completedAt": null,
  "errorMessage": null
}
```

#### Error Responses

**404 Not Found**
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Job not found"
}
```

---

### 6. Get Job Results

**GET** `/bulk-jobs/{jobId}/results`

Retrieve paginated results of a bulk job operation.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 10 | Results per page (max 100) |
| offset | integer | 0 | Number of results to skip |

#### Request

```
GET /bulk-jobs/550e8400-e29b-41d4-a716-446655440000/results?limit=25&offset=0
Authorization: Bearer <TOKEN>
```

#### Response (200 OK)

```json
{
  "results": [
    {
      "itemIndex": 0,
      "status": "success",
      "documentId": "doc-new-uuid-1",
      "error": null
    },
    {
      "itemIndex": 1,
      "status": "failure",
      "documentId": null,
      "error": "Invalid MIME type"
    },
    {
      "itemIndex": 2,
      "status": "success",
      "documentId": "doc-new-uuid-3",
      "error": null
    }
  ],
  "total": 100,
  "limit": 25,
  "offset": 0
}
```

---

### 7. Cancel Job

**POST** `/bulk-jobs/{jobId}/cancel`

Cancel a pending or processing job.

#### Request

```json
{
  "reason": "User requested cancellation"
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reason | string | No | Reason for cancellation |

#### Response (204 No Content)

```
[Empty body]
```

#### Error Responses

**409 Conflict** (Job already completed/failed/cancelled)
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Cannot cancel job in COMPLETED status"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 202 | Accepted | Job successfully created |
| 200 | OK | Status/results retrieved |
| 204 | No Content | Job cancelled |
| 400 | Bad Request | Invalid input (validation) |
| 401 | Unauthorized | Missing/invalid auth token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Cannot perform operation on job |
| 413 | Payload Too Large | > 1000 items |
| 500 | Server Error | Internal server error |

### Error Response Format

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Detailed error message",
  "details": {
    "field": "documentIds",
    "reason": "exceeds maximum length"
  }
}
```

---

## Rate Limiting

Rate limits are applied per tenant:

- **Job Creation**: 100 jobs/hour per tenant
- **Status Checks**: 1000 requests/hour per tenant
- **Results Retrieval**: 500 requests/hour per tenant

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1639312800
```

---

## Polling Strategy

For monitoring job progress, recommended polling intervals:

- **First 30 seconds**: Poll every 2 seconds
- **30-300 seconds**: Poll every 10 seconds
- **After 5 minutes**: Poll every 30 seconds
- **After 30 minutes**: Poll every 60 seconds

### Example Polling Code

```typescript
async function waitForJob(jobId: string, maxWaitMs = 3600000): Promise<BulkJob> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const job = await getJobStatus(jobId);
    
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      return job;
    }
    
    // Adaptive polling interval
    const elapsed = Date.now() - startTime;
    const waitTime = elapsed < 30000 ? 2000 
                   : elapsed < 300000 ? 10000
                   : elapsed < 1800000 ? 30000
                   : 60000;
    
    await new Promise(r => setTimeout(r, waitTime));
  }
  
  throw new Error('Job timeout exceeded');
}
```

---

## Webhooks

When webhooks are configured, the following events are sent:

### BULK_UPLOAD_STARTED
```json
{
  "event": "bulk_upload_started",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "tenant-123",
  "totalItems": 100,
  "timestamp": "2025-12-12T10:00:05Z"
}
```

### BULK_UPLOAD_COMPLETED
```json
{
  "event": "bulk_upload_completed",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "tenant-123",
  "totalItems": 100,
  "successCount": 95,
  "failureCount": 5,
  "completedAt": "2025-12-12T10:05:00Z"
}
```

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Create bulk upload job
const createBulkUploadJob = async (items: BulkUploadItem[]) => {
  const response = await fetch('https://api.example.com/api/v1/documents/bulk-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ items })
  });

  const job = await response.json();
  return job.jobId;
};

// Poll for completion
const waitForCompletion = async (jobId: string) => {
  while (true) {
    const response = await fetch(
      `https://api.example.com/api/v1/bulk-jobs/${jobId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    const job = await response.json();
    console.log(`Progress: ${job.progress}%`);
    
    if (job.status !== 'PROCESSING') {
      return job;
    }
    
    await new Promise(r => setTimeout(r, 10000));
  }
};

// Get results
const getResults = async (jobId: string) => {
  const response = await fetch(
    `https://api.example.com/api/v1/bulk-jobs/${jobId}/results?limit=10&offset=0`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  return await response.json();
};
```

### cURL

```bash
# Create job
curl -X POST https://api.example.com/api/v1/documents/bulk-upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "name": "doc.pdf",
        "fileSize": 1024000,
        "mimeType": "application/pdf",
        "storagePath": "doc.pdf",
        "visibility": "public"
      }
    ]
  }'

# Check status
curl https://api.example.com/api/v1/bulk-jobs/{jobId} \
  -H "Authorization: Bearer $TOKEN"

# Get results
curl "https://api.example.com/api/v1/bulk-jobs/{jobId}/results?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Best Practices

1. **Batch Size**: Use 100-500 items per job for optimal performance
2. **Polling**: Use adaptive polling intervals (2s, 10s, 30s, 60s)
3. **Error Handling**: Always check individual item results for failures
4. **Timeouts**: Set client-side timeout longer than 1 hour
5. **Retry Logic**: Implement exponential backoff for transient errors
6. **Monitoring**: Track job creation, completion, and failure rates

---

## Limitations

- **Max Items Per Job**: 1,000
- **Max Concurrent Jobs**: 2 per server instance
- **Job Timeout**: 1 hour default (configurable)
- **Result Retention**: 30 days
- **Rate Limit**: 100 jobs/hour per tenant

---

## Configuration

### Environment Variables

```bash
# Worker configuration
BULK_JOB_WORKER_POLL_INTERVAL=5000        # Poll interval (ms)
BULK_JOB_WORKER_MAX_CONCURRENT=2          # Max concurrent jobs
BULK_JOB_WORKER_MAX_DURATION=3600000      # Job timeout (ms)
COSMOS_DB_BULK_JOBS_CONTAINER=bulk-jobs   # Container name
```

---

## Support

For issues, questions, or feature requests, contact: api-support@example.com

---

**Version History**
- v1.0 (2025-12-12) - Initial release

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Bulk operations API fully implemented

#### Implemented Features (✅)

- ✅ Bulk upload
- ✅ Bulk delete
- ✅ Bulk update
- ✅ Bulk collection assignment
- ✅ Job status tracking
- ✅ Progress monitoring
- ✅ Error handling
- ✅ Webhook support

#### Known Limitations

- ⚠️ **Worker Performance** - Worker performance may need optimization for large batches
  - **Recommendation:**
    1. Monitor worker performance
    2. Optimize batch processing
    3. Document performance tuning

- ⚠️ **Error Recovery** - Error recovery may need improvement
  - **Recommendation:**
    1. Improve error recovery mechanisms
    2. Test error scenarios
    3. Document error handling

### Code References

- **Backend Services:**
  - `apps/api/src/services/document-bulk.service.ts` - Bulk operations service
  - `apps/api/src/controllers/document-bulk.controller.ts` - Bulk operations controller

- **API Routes:**
  - `/api/v1/document-bulk/*` - Bulk operations endpoints

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Deployment Guide](../guides/deployment-bulk-operations.md) - Bulk operations deployment
- [Backend Documentation](../backend/README.md) - Backend implementation
