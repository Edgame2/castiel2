# Audit Logging Testing Guide
**Quick Start for Verifying Task 13 Implementation**

## Prerequisites

- API running: `pnpm dev` 
- Valid tenant and user credentials
- Postman or curl installed

## Test Flow

### 1. Start the API Server
```bash
cd /home/neodyme/Documents/Castiel/castiel
pnpm dev
```

Expected output:
```
✅ Audit log service initialized
✅ Document management controller initialized with Azure Storage
✅ Document routes registered
```

### 2. Authenticate

Get an auth token using your preferred method:
```bash
# Option 1: Use existing credentials
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'

# Copy the token from response
TOKEN="<token_here>"
TENANT_ID="<tenant_id>"
```

### 3. Test Document Operations

#### 3a. Upload Document
```bash
curl -X POST http://localhost:3001/api/v1/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/test.pdf" \
  -F 'metadata={"filename":"test.pdf","category":"general"}'
```

Expected response: 201 Created with document ID
Expected audit log: `document.uploaded` event with file metadata

#### 3b. View Document
```bash
curl -X GET http://localhost:3001/api/v1/documents/$DOCUMENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

Expected audit log: `document.viewed` event with IP address and user-agent

#### 3c. Download Document
```bash
curl -X GET http://localhost:3001/api/v1/documents/$DOCUMENT_ID/download \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded.pdf
```

Expected audit log: `document.downloaded` event

#### 3d. Update Document
```bash
curl -X PATCH http://localhost:3001/api/v1/documents/$DOCUMENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "filename": "test-updated.pdf",
      "category": "important"
    }
  }'
```

Expected audit log: `document.updated` event with before/after changes

#### 3e. Delete Document
```bash
curl -X DELETE http://localhost:3001/api/v1/documents/$DOCUMENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

Expected audit log: `document.deleted` event

### 4. Test Collection Operations

#### 4a. Create Collection
```bash
curl -X POST http://localhost:3001/api/v1/collections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Collection",
    "description": "For testing audit logging",
    "type": "folder",
    "visibility": "internal"
  }'
```

Expected response: 201 Created with collection ID
Expected audit log: `collection.created` event

#### 4b. Add Document to Collection
```bash
curl -X POST http://localhost:3001/api/v1/collections/$COLLECTION_ID/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentIds": ["'$DOCUMENT_ID'"]}'
```

Expected audit log: `collection.document.added` event

#### 4c. Remove Document from Collection
```bash
curl -X DELETE http://localhost:3001/api/v1/collections/$COLLECTION_ID/documents/$DOCUMENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

Expected audit log: `collection.document.removed` event

### 5. Verify Audit Logs in Cosmos DB

#### Option 1: Run Verification Script
```bash
pnpm run verify:audit-logs
```

Expected output:
```
Querying audit logs from the last 1 hour...
Found 5 audit entries:
- document.uploaded (2025-12-12T10:30:00Z)
- document.viewed (2025-12-12T10:30:15Z)
- document.downloaded (2025-12-12T10:30:30Z)
- document.updated (2025-12-12T10:30:45Z)
- document.deleted (2025-12-12T10:31:00Z)
```

#### Option 2: Query Cosmos DB Directly
```bash
# Using Azure Cosmos DB Explorer
# Container: audit-logs
# Query:
SELECT * FROM c 
WHERE c.tenantId = '$TENANT_ID' 
  AND c.timestamp > DateTimeAdd("hour", -1, GetCurrentTimestamp())
ORDER BY c.timestamp DESC
```

### 6. Verify Audit Event Structure

Each audit log entry should look like:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "tenant-123",
  "userId": "user-456",
  "action": "document.uploaded",
  "timestamp": "2025-12-12T10:30:00.000Z",
  "ipAddress": "192.168.1.100",
  "userAgent": "curl/7.68.0",
  "documentId": "doc-789",
  "metadata": {
    "filename": "test.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "category": "general",
    "tags": [],
    "visibility": "internal",
    "uploadDurationMs": 2450
  },
  "status": "success"
}
```

### 7. Check Specific Fields

#### IP Address Capture
```bash
# Verify IP is captured
pnpm run verify:audit-logs | grep -i "ipaddress"

# Expected: Should show the IP address of the request origin
```

#### User-Agent Capture
```bash
# Check if user-agent is properly recorded
pnpm run verify:audit-logs | grep -i "useragent"

# Expected: Should show the client's user-agent string
```

#### Multi-Tenant Isolation
```bash
# Query with different tenant ID - should see nothing
SELECT * FROM c WHERE c.tenantId = 'other-tenant-id'

# Expected: Empty result set
# This proves tenant isolation is working
```

## Troubleshooting

### Issue: No audit logs appearing

1. **Check API server is running**
   ```bash
   ps aux | grep "pnpm dev"
   ```

2. **Verify Cosmos DB connection**
   ```bash
   # Check logs for "Cosmos DB connection established"
   tail -100 /tmp/castiel-dev.log | grep -i cosmos
   ```

3. **Check authentication**
   - Ensure token is valid
   - Verify tenant ID is correct

4. **Check response status codes**
   - Document operations should return 200/201
   - Check for 500 errors indicating audit failure

### Issue: Audit service not initialized

1. **Check startup logs**
   ```bash
   tail -100 /tmp/castiel-dev.log | grep -i "audit"
   ```

2. **Verify initialization order**
   ```bash
   # Should see in this order:
   # - Cosmos DB connection established
   # - Audit log service initialized
   # - Document management controller initialized
   ```

3. **Check Cosmos DB container exists**
   - Container: `AuditLogs` should exist
   - If missing, will be auto-created on first log

### Issue: IP address not captured

1. **Verify request includes IP**
   ```bash
   # When running locally, check request.ip value
   # Should be 127.0.0.1 or ::1 for local requests
   ```

2. **Check request headers**
   - For proxied requests, may need X-Forwarded-For header

### Issue: User-agent not captured

1. **Verify curl/client sends User-Agent header**
   ```bash
   curl -v ... # -v shows all headers
   ```

2. **Fallback value**
   - If missing, should be recorded as "unknown"
   - Check for undefined or null values

## Performance Testing

### Test audit logging at scale
```bash
# Generate 100 document uploads
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/v1/documents/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/path/to/test.pdf" \
    -F 'metadata={"filename":"test-'$i'.pdf"}'
  sleep 0.1  # 100ms delay between requests
done
```

Monitor:
- Cosmos DB write latency
- CPU/Memory usage
- API response times

### Expected results
- Audit logs created successfully for all operations
- No audit failures or errors
- Response time <500ms per operation

## Success Criteria

All of these must pass:
- [ ] API starts without "Cannot access 'auditLogService'" error
- [ ] Document upload creates `document.uploaded` audit log
- [ ] Document view creates `document.viewed` audit log
- [ ] Document download creates `document.downloaded` audit log
- [ ] Document update creates `document.updated` audit log
- [ ] Document delete creates `document.deleted` audit log
- [ ] Collection create creates `collection.created` audit log
- [ ] Document addition creates `collection.document.added` audit log
- [ ] Document removal creates `collection.document.removed` audit log
- [ ] IP address is captured in all logs
- [ ] User-agent is captured in all logs
- [ ] Tenant ID isolation is enforced
- [ ] Audit failures don't break operations
- [ ] Verify script successfully queries logs

## Next Steps

Once audit logging is verified:
1. Deploy to staging environment
2. Run integration tests
3. Monitor Cosmos DB performance
4. Implement Task 14: Webhook event delivery

## Cleanup (Optional)

Remove test documents after verification:
```bash
curl -X DELETE http://localhost:3001/api/v1/documents/$DOCUMENT_ID \
  -H "Authorization: Bearer $TOKEN"

curl -X DELETE http://localhost:3001/api/v1/collections/$COLLECTION_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

**Status:** Ready to test  
**Last Updated:** December 12, 2025
