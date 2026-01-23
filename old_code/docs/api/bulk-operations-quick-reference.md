# Task 9 Quick Reference - Bulk Document Operations

## Quick Start

### 1. Start a Bulk Upload Job
```bash
curl -X POST http://localhost:3000/api/v1/documents/bulk-upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "name": "document.pdf",
        "fileSize": 1024000,
        "mimeType": "application/pdf",
        "storagePath": "path/to/file",
        "visibility": "public"
      }
    ]
  }'

Response:
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "totalItems": 1,
  "processedItems": 0,
  "progress": 0
}
```

### 2. Check Job Status
```bash
curl http://localhost:3000/api/v1/bulk-jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN"

Response:
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PROCESSING",
  "totalItems": 1,
  "processedItems": 1,
  "successCount": 1,
  "failureCount": 0,
  "progress": 100
}
```

### 3. Get Job Results
```bash
curl "http://localhost:3000/api/v1/bulk-jobs/550e8400-e29b-41d4-a716-446655440000/results?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"

Response:
{
  "results": [
    {
      "itemIndex": 0,
      "status": "success",
      "documentId": "doc-uuid-123",
      "message": null
    }
  ],
  "total": 1
}
```

## Supported Operations

### Bulk Upload
**Endpoint**: `POST /api/v1/documents/bulk-upload`
- **Max Items**: 1000 per job
- **Time to Complete**: Varies by file sizes
- **Async**: Yes (202 Accepted)

### Bulk Delete
**Endpoint**: `POST /api/v1/documents/bulk-delete`
- **Max Items**: 1000 per job
- **Request**: `{ "documentIds": ["id1", "id2"], "hardDelete": false }`
- **Async**: Yes (202 Accepted)

### Bulk Update
**Endpoint**: `POST /api/v1/documents/bulk-update`
- **Max Items**: 1000 per job
- **Request**: `{ "updates": [{ "documentId": "id", "metadata": {...} }] }`
- **Async**: Yes (202 Accepted)

### Bulk Collection Assign
**Endpoint**: `POST /api/v1/collections/:collectionId/bulk-assign`
- **Max Items**: 1000 per job
- **Request**: `{ "documentIds": ["id1", "id2"] }`
- **Async**: Yes (202 Accepted)

## Job Statuses

| Status | Meaning | Action |
|--------|---------|--------|
| `PENDING` | Waiting to be processed | Check again soon |
| `PROCESSING` | Currently being processed | Check progress |
| `COMPLETED` | Job finished successfully | Get results |
| `FAILED` | Job failed (see error) | Review error message |
| `CANCELLED` | Job was cancelled | Cannot be resumed |

## Configuration

### Environment Variables
```bash
# Poll interval (how often worker checks for jobs)
BULK_JOB_WORKER_POLL_INTERVAL=5000

# Maximum concurrent jobs (prevents server overload)
BULK_JOB_WORKER_MAX_CONCURRENT=2

# Job timeout (prevents infinite processing)
BULK_JOB_WORKER_MAX_DURATION=3600000

# Cosmos DB container name
COSMOS_DB_BULK_JOBS_CONTAINER=bulk-jobs
```

### Default Polling Behavior
- Worker polls every 5 seconds
- Processes up to 2 jobs in parallel
- Each job has 1 hour timeout
- Jobs run in background (non-blocking API)

## Performance Tips

1. **Optimal Batch Size**: 100-500 items per job
2. **Peak Hours**: Space out bulk operations if possible
3. **Progress Checking**: Poll status every 10-30 seconds
4. **Error Handling**: Check results endpoint for individual item errors

## Error Handling

### Common Errors

#### 400 Bad Request
- Invalid document ID format
- Missing required fields
- Invalid visibility value

```bash
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid request payload"
}
```

#### 401 Unauthorized
- Missing or invalid authorization token

#### 403 Forbidden
- Not allowed to perform operation on this tenant/collection

#### 404 Not Found
- Job ID doesn't exist
- Collection doesn't exist

#### 413 Payload Too Large
- Exceeded 1000 items per job

## API Response Codes

| Code | Meaning |
|------|---------|
| 202 | Accepted (job created, processing started) |
| 200 | OK (status/results retrieved) |
| 204 | No Content (successful cancel) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (auth required) |
| 403 | Forbidden (permissions) |
| 404 | Not Found (resource doesn't exist) |
| 413 | Payload Too Large (> 1000 items) |
| 500 | Internal Server Error |

## Progress Tracking

### Getting Current Progress
```bash
curl http://localhost:3000/api/v1/bulk-jobs/{jobId} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Returns:
```json
{
  "jobId": "uuid",
  "status": "PROCESSING",
  "totalItems": 100,
  "processedItems": 45,
  "successCount": 40,
  "failureCount": 5,
  "progress": 45  // percentage
}
```

### Handling Individual Item Failures
```bash
curl http://localhost:3000/api/v1/bulk-jobs/{jobId}/results \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Returns items with status and error messages:
```json
{
  "results": [
    {
      "itemIndex": 0,
      "status": "success",
      "documentId": "doc-123"
    },
    {
      "itemIndex": 5,
      "status": "failure",
      "error": "Document not found"
    }
  ]
}
```

## Cancellation

### Cancel a Pending/Processing Job
```bash
curl -X POST http://localhost:3000/api/v1/bulk-jobs/{jobId}/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "User requested cancellation"
  }'
```

**Note**: Can only cancel jobs in PENDING or PROCESSING status

## Monitoring

### Job Metrics
- Total jobs (by status)
- Processing time
- Success/failure counts
- Items per second throughput

### Tracking in Application Insights
```
bulkJobWorker.jobProcessingStarted
bulkJobWorker.jobProcessingCompleted
bulkJobWorker.jobTimeout
bulkJobWorker.jobFailed
```

## Troubleshooting

### Worker Not Processing Jobs
1. Check if `BULK_JOB_WORKER_MAX_CONCURRENT` is > 0
2. Verify job is in PENDING status
3. Check server logs for errors

### Jobs Timing Out
1. Increase `BULK_JOB_WORKER_MAX_DURATION` if needed
2. Reduce batch size
3. Check server resource availability

### Invalid Response Format
1. Ensure Authorization header is present
2. Check tenantId in URL matches authenticated user
3. Verify Content-Type is application/json

## Examples

### Example 1: Bulk Upload Multiple Files
```bash
curl -X POST http://localhost:3000/api/v1/documents/bulk-upload \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "name": "contract.pdf",
        "fileSize": 2048000,
        "mimeType": "application/pdf",
        "storagePath": "contracts/2025/contract_001.pdf",
        "category": "legal",
        "tags": ["important", "2025"],
        "visibility": "internal"
      },
      {
        "name": "invoice.xlsx",
        "fileSize": 512000,
        "mimeType": "application/vnd.ms-excel",
        "storagePath": "invoices/2025/invoice_001.xlsx",
        "category": "finance",
        "visibility": "confidential"
      }
    ]
  }'
```

### Example 2: Poll Until Complete
```bash
#!/bin/bash
JOB_ID="550e8400-e29b-41d4-a716-446655440000"
TOKEN="YOUR_TOKEN"

while true; do
  STATUS=$(curl -s http://localhost:3000/api/v1/bulk-jobs/$JOB_ID \
    -H "Authorization: Bearer $TOKEN" | jq -r '.status')
  
  if [ "$STATUS" == "COMPLETED" ] || [ "$STATUS" == "FAILED" ]; then
    echo "Job finished with status: $STATUS"
    break
  fi
  
  echo "Job status: $STATUS, sleeping 10s..."
  sleep 10
done
```

### Example 3: Bulk Delete with Hard Delete
```bash
curl -X POST http://localhost:3000/api/v1/documents/bulk-delete \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentIds": [
      "doc-123",
      "doc-456",
      "doc-789"
    ],
    "hardDelete": true,
    "reason": "Cleanup of outdated documents"
  }'
```

## Important Notes

1. **Jobs are immutable**: Once created, job details cannot be changed
2. **Results are transient**: Keep results until you've processed them
3. **Webhooks fire on completion**: If configured, webhooks notify on job completion
4. **Audit events logged**: All operations are logged for compliance
5. **Tenant isolation**: Each job is isolated to its tenant

---

**For more details, see**: `TASK-9-BULK-OPERATIONS-COMPLETE.md`

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Bulk operations quick reference fully documented

#### Implemented Features (✅)

- ✅ Quick reference guide
- ✅ API endpoint examples
- ✅ Job status tracking
- ✅ Error handling examples

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Bulk Operations API](./bulk-operations-api.md) - Full API documentation
- [Deployment Guide](../guides/deployment-bulk-operations.md) - Deployment guide
