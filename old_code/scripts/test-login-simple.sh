#!/bin/bash
# Simple login test - just test if endpoint works
echo "Testing login endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"Morpheus@12"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
  TOKEN=$(echo "$BODY" | jq -r '.token')
  echo -e "\n✅ Login successful!"
  echo "Token (first 50 chars): ${TOKEN:0:50}..."
  echo "$TOKEN" > /tmp/admin-token.txt
  echo "Full token saved to /tmp/admin-token.txt"
else
  echo "❌ Login failed!"
fi
