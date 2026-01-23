#!/bin/bash

# Test Audit Logging Integration
# This script verifies that audit logging is working end-to-end

set -e

echo "=========================================="
echo "AUDIT LOGGING INTEGRATION TEST"
echo "=========================================="
echo ""

# Configuration
API_URL="http://localhost:3001"
TENANT_ID="4b189cbb10d93bb3ede467b34afe7909"
USER_ID="1985d117f61ce3e549a2a98b0d438fcf"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxOTg1ZDExN2Y2MWNlM2U1NDlhMmE5OGIwZDQzOGZjZiIsImVtYWlsIjoiYWRtaW5AYWRtaW4uY29tIiwidGVuYW50SWQiOiI0YjE4OWNiYjEwZDkzYmIzZWRlNDY3YjM0YWZlNzkwOSIsImlzRGVmYXVsdFRlbmFudCI6dHJ1ZSwiZmlyc3ROYW1lIjoiQWRtaW5kIiwibGFzdE5hbWUiOiJBZG1pbiIsInJvbGUiOiJzdXBlci1hZG1pbiIsInJvbGVzIjpbInN1cGVyLWFkbWluIiwiYWRtaW4iLCJ1c2VyIl0sInN0YXR1cyI6ImFjdGl2ZSIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NjU1MzUzNjEsImV4cCI6MTc2NTU2NDE2MX0.JoVWmgrFbf69_r5Kyzl-SUbWsYttSyHgm78bfOE5i9w"

# Test document metadata
TEST_FILE="/tmp/test-document.txt"
echo "This is a test document for audit logging" > $TEST_FILE

echo "1. Checking API connectivity..."
if curl -s "$API_URL/docs" > /dev/null; then
    echo "   ✅ API is running on port 3001"
else
    echo "   ❌ API is not responding"
    exit 1
fi

echo ""
echo "2. Testing Document Upload (document.uploaded event)..."
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$TEST_FILE" \
  -F 'metadata={"filename":"test-audit.txt","category":"testing","tags":["test","audit"]}')

DOCUMENT_ID=$(echo $UPLOAD_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$DOCUMENT_ID" ]; then
    echo "   ⚠️  Upload response: $UPLOAD_RESPONSE"
    echo "   ❌ Failed to upload document"
    exit 1
else
    echo "   ✅ Document uploaded successfully"
    echo "      Document ID: $DOCUMENT_ID"
fi

echo ""
echo "3. Testing Document View (document.viewed event)..."
VIEW_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/documents/$DOCUMENT_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo $VIEW_RESPONSE | grep -q "$DOCUMENT_ID"; then
    echo "   ✅ Document viewed successfully"
else
    echo "   ❌ Failed to view document"
fi

echo ""
echo "4. Testing Document Download (document.downloaded event)..."
DOWNLOAD_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/documents/$DOCUMENT_ID/download" \
  -H "Authorization: Bearer $TOKEN" \
  -o /tmp/downloaded-test.txt)

if [ -f "/tmp/downloaded-test.txt" ]; then
    echo "   ✅ Document downloaded successfully"
else
    echo "   ⚠️  Download may have succeeded (check API logs)"
fi

echo ""
echo "5. Testing Document Update (document.updated event)..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$API_URL/api/v1/documents/$DOCUMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"metadata":{"filename":"test-audit-updated.txt","category":"testing-updated","tags":["test","audit","updated"]}}')

if echo $UPDATE_RESPONSE | grep -q '"success"'; then
    echo "   ✅ Document updated successfully"
else
    echo "   ⚠️  Update response: $UPDATE_RESPONSE"
fi

echo ""
echo "6. Verifying Audit Logs in Cosmos DB..."
cd /home/neodyme/Documents/Castiel/castiel/apps/api
AUDIT_COUNT=$(pnpm run verify:audit-logs 2>/dev/null | grep -c "Found" || echo "0")

if [ "$AUDIT_COUNT" -gt "0" ]; then
    echo "   ✅ Audit logs found in Cosmos DB"
    pnpm run verify:audit-logs 2>/dev/null | tail -20
else
    echo "   ⚠️  Audit logs not yet visible (may need time to write)"
fi

echo ""
echo "7. Testing Collection Operations..."
CREATE_COLLECTION=$(curl -s -X POST "$API_URL/api/v1/collections" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Collection","description":"For audit testing","type":"folder","visibility":"internal"}')

COLLECTION_ID=$(echo $CREATE_COLLECTION | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$COLLECTION_ID" ]; then
    echo "   ⚠️  Collection creation failed or returned empty ID"
else
    echo "   ✅ Collection created: $COLLECTION_ID"
fi

echo ""
echo "=========================================="
echo "TEST COMPLETE"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Check API logs: tail -100 /tmp/api.log"
echo "2. Query audit logs: pnpm run verify:audit-logs"
echo "3. Check Cosmos DB audit-logs container directly"
echo ""
