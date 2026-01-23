#!/bin/bash
#
# Test Dashboard Creation
#

echo "Testing Dashboard Creation API..."
echo "=================================="

# Get auth token (you'll need to replace this with a real token)
TOKEN="${AUTH_TOKEN:-YOUR_TOKEN_HERE}"
TENANT_ID="${TENANT_ID:-test-tenant-123}"

echo ""
echo "Using:"
echo "  API: http://localhost:3001"
echo "  Tenant: $TENANT_ID"
echo ""

# Test with timeout
echo "Sending POST request to create dashboard..."
START=$(date +%s)

RESPONSE=$(timeout 35 curl -X POST http://localhost:3001/api/v1/dashboards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{"name": "Test Dashboard"}' \
  -w "\n\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" \
  -s 2>&1)

END=$(date +%s)
DURATION=$((END - START))

echo ""
echo "Response (took ${DURATION}s):"
echo "=================================="
echo "$RESPONSE"
echo ""

# Check if it timed out
if echo "$RESPONSE" | grep -q "timeout"; then
    echo "❌ REQUEST TIMED OUT"
elif echo "$RESPONSE" | grep -q "HTTP_CODE:201"; then
    echo "✅ Dashboard created successfully!"
elif echo "$RESPONSE" | grep -q "HTTP_CODE:401"; then
    echo "⚠️  Authentication failed - need valid token"
elif echo "$RESPONSE" | grep -q "HTTP_CODE:"; then
    echo "⚠️  Request completed with error"
else
    echo "❌ Unknown error or timeout"
fi

echo ""
echo "Check API logs for details:"
echo "  tail -f apps/api logs or check console"
