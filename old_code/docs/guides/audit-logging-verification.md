# Audit Logging Verification Guide

**Date:** 2025-12-12  
**Status:** ✅ Ready for Testing

## Verification Results

### ✅ What's Working
- Migration script successfully initialized 3 tenants with documentSettings
- Azure Blob Storage containers (documents, quarantine) verified/created
- Document and Collection controllers updated with audit logging calls
- Audit logging infrastructure complete and ready

### ⏳ What's Pending
- Audit logs container will be auto-created on first logged event
- Currently no documents uploaded, so no audit logs yet

## How to Verify Audit Logging

### Step 1: Start the API Server
```bash
cd /home/neodyme/Documents/Castiel/castiel
pnpm dev
```

Wait for the message: `✓ Server listening on http://localhost:3001`

### Step 2: Upload a Test Document

Using curl (requires the file to exist):
```bash
# Create a test file
echo "Test document content for audit verification" > /tmp/test-audit.txt

# Upload it
curl -X POST http://localhost:3001/api/v1/documents/upload \
  -F "file=@/tmp/test-audit.txt" \
  -F "name=Test Audit Document" \
  -F "category=test" \
  -F "visibility=internal" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "X-Tenant-ID: test-tenant-1" \
  -H "X-User-ID: test-user-1"
```

Using Postman:
1. Open Postman
2. Create a POST request to `http://localhost:3001/api/v1/documents/upload`
3. Add Headers:
   - `Authorization: Bearer <JWT_TOKEN>`
   - `X-Tenant-ID: test-tenant-1`
   - `X-User-ID: test-user-1`
4. Body → form-data:
   - `file` (type: File) → select test file
   - `name` (type: Text) → "Audit Test Document"
   - `category` (type: Text) → "test"
   - `visibility` (type: Text) → "internal"
5. Click Send

### Step 3: Verify Audit Log Creation

Run the verification script:
```bash
cd /home/neodyme/Documents/Castiel/castiel/apps/api
pnpm run verify:audit-logs
```

Expected output:
```
✓ Connected to Cosmos DB: castiel
✓ Audit logs container: audit-logs

Querying recent audit logs...

✅ Found 1 audit log entries:

1. document.uploaded
   Resource: document/doc-xyz789
   Timestamp: 2025-12-12T14:30:45.123Z
   File: Audit Test Document
   Size: 0.05 KB
   IP: 127.0.0.1

📊 Most Recent Audit Entry (Full Details):
{
  "id": "audit-123",
  "tenantId": "test-tenant-1",
  "userId": "test-user-1",
  "action": "document.uploaded",
  "resourceType": "document",
  "resourceId": "doc-xyz789",
  "resourceName": "Audit Test Document",
  "metadata": {
    "fileName": "Audit Test Document",
    "fileSize": 47,
    "mimeType": "text/plain",
    "category": "test",
    "visibility": "internal",
    "ipAddress": "127.0.0.1",
    "userAgent": "curl/..."
  },
  "timestamp": "2025-12-12T14:30:45.123Z"
}
```

## Audit Events to Test

Once documents are uploaded, test these flows:

### 1. Document Upload ✅
- Logs: `document.uploaded`
- Payload includes: fileName, fileSize, MIME type, category, tags, visibility
- Captured: IP address, user-agent

### 2. Document View
```bash
curl -X GET http://localhost:3001/api/v1/documents/{documentId} \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-ID: test-tenant-1" \
  -H "X-User-ID: test-user-1"
```
- Logs: `document.viewed`
- Captured: documentId, fileName, IP, user-agent

### 3. Document Download
```bash
curl -X GET http://localhost:3001/api/v1/documents/{documentId}/download \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-ID: test-tenant-1" \
  -H "X-User-ID: test-user-1"
```
- Logs: `document.downloaded`
- Payload includes: fileName, fileSize
- Captured: IP address, user-agent

### 4. Document Update
```bash
curl -X PUT http://localhost:3001/api/v1/documents/{documentId} \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-ID: test-tenant-1" \
  -H "X-User-ID: test-user-1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "category": "invoices",
    "tags": ["2025", "Q4"]
  }'
```
- Logs: `document.updated`
- Payload includes: before/after values for changed fields

### 5. Document Delete
```bash
curl -X DELETE http://localhost:3001/api/v1/documents/{documentId} \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-ID: test-tenant-1" \
  -H "X-User-ID: test-user-1"
```
- Logs: `document.deleted`
- Includes: softDelete flag, reason

### 6. Collection Creation
```bash
curl -X POST http://localhost:3001/api/v1/collections \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-ID: test-tenant-1" \
  -H "X-User-ID: test-user-1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q4 Invoices",
    "collectionType": "folder",
    "visibility": "internal",
    "tags": ["2025", "Q4"]
  }'
```
- Logs: collection creation with type and visibility

### 7. Add Document to Collection
```bash
curl -X POST http://localhost:3001/api/v1/collections/{collectionId}/documents \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-ID: test-tenant-1" \
  -H "X-User-ID: test-user-1" \
  -H "Content-Type: application/json" \
  -d '{
    "documentIds": ["doc-123", "doc-456"]
  }'
```
- Logs: each document added to collection
- Captured: documentId, collectionName

## Checking Audit Logs Directly

### Via Cosmos DB Portal
1. Go to Azure Portal → Cosmos DB → castiel database
2. Open Data Explorer
3. Navigate to: **castiel** → **audit-logs** → Items
4. View recent entries (sorted by timestamp descending)

### Via Cosmos DB Emulator (Local Dev)
```bash
# Query all audit logs for a tenant
curl -X POST https://localhost:8081/_api/query \
  -H "Content-Type: application/json" \
  -H "x-ms-documentdb-isquery: true" \
  -d '{
    "query": "SELECT * FROM audit-logs c WHERE c.tenantId = @tenantId ORDER BY c.timestamp DESC",
    "parameters": [{ "name": "@tenantId", "value": "test-tenant-1" }]
  }'
```

### Via Node.js Script
```bash
pnpm run verify:audit-logs
```

This queries the 10 most recent audit log entries for document operations.

## Expected Audit Log Structure

```json
{
  "id": "<uuid>",
  "tenantId": "test-tenant-1",
  "userId": "test-user-1",
  "action": "document.uploaded",
  "resourceType": "document",
  "resourceId": "<documentId>",
  "resourceName": "<fileName>",
  "timestamp": "2025-12-12T14:30:45.123Z",
  "severity": "INFO",
  "status": "SUCCESS",
  "ipAddress": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "sessionId": "<sessionId>",
  "metadata": {
    "fileName": "test.pdf",
    "fileSize": 2048,
    "mimeType": "application/pdf",
    "category": "invoices",
    "tags": ["2025"],
    "visibility": "internal",
    "uploadDurationMs": 1250,
    "changes": {
      "name": { "old": "old-name", "new": "new-name" },
      "category": { "old": "old-cat", "new": "new-cat" }
    }
  }
}
```

## Troubleshooting

### Issue: 404 - Document Not Found
- Ensure JWT token is valid and includes correct user/tenant info
- Verify document exists: `GET /api/v1/documents` to list all

### Issue: 403 - Insufficient Permissions
- Verify ACL permissions on document
- Check that user has READ/WRITE/DELETE permission as needed

### Issue: Audit logs not appearing
- Check that the API server is running (`pnpm dev`)
- Verify Cosmos DB connectivity: `pnpm run verify:audit-logs`
- Check API logs for errors: look at console output

### Issue: Azure Storage connection error
- Verify `AZURE_STORAGE_CONNECTION_STRING` in `.env`
- Verify containers exist: `azure-storage-containers list`

## Next Steps

After verifying audit logging works:

1. **Task 14:** Implement webhook event delivery
   - Emit events when audit entries are created
   - Deliver to tenant-configured webhook endpoints

2. **Task 9:** Implement bulk operations
   - Async job processing for bulk upload/delete
   - Progress tracking and per-item audit logs

3. **Dashboard Integration**
   - Display audit logs in admin dashboard
   - Filter by date, action, resource type, user

---

**Ready?** Start the API server and upload your first document to see audit logging in action!

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Audit logging fully implemented

#### Implemented Features (✅)

- ✅ Audit log container initialization
- ✅ Document upload audit logging
- ✅ Document view audit logging
- ✅ Document download audit logging
- ✅ Document update audit logging
- ✅ Document delete audit logging
- ✅ Collection creation audit logging
- ✅ Verification scripts
- ✅ Comprehensive audit trail service

#### Known Limitations

- ⚠️ **Audit Log Retention** - Retention policies may need configuration
  - **Recommendation:**
    1. Configure audit log retention policies
    2. Set up automated cleanup
    3. Document retention procedures

- ⚠️ **Audit Log Querying** - Query performance may need optimization
  - **Recommendation:**
    1. Optimize audit log queries
    2. Add query indexes if needed
    3. Document query patterns

### Code References

- **Backend Services:**
  - `apps/api/src/services/audit-trail.service.ts` - Audit trail service
  - `apps/api/src/services/comprehensive-audit-trail.service.ts` - Comprehensive audit trail
  - `apps/api/src/services/phase2-audit-trail.service.ts` - Phase 2 audit trail

- **API Routes:**
  - `/api/v1/audit-log/*` - Audit log endpoints
  - `/api/v1/phase2-audit-trail/*` - Phase 2 audit trail
  - `/api/v1/comprehensive-audit-trail/*` - Comprehensive audit trail

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Backend Documentation](../backend/README.md) - Backend implementation
