#!/bin/bash
cd /home/neodyme/Documents/Castiel/castiel/apps/api

echo "Starting API server..."
pnpm dev > /tmp/api-server.log 2>&1 &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"

echo "Waiting for server to be ready..."
for i in {1..30}; do
  if lsof -i :3001 | grep -q LISTEN; then
    echo "Server is listening on port 3001!"
    break
  fi
  sleep 1
  echo "Waiting... ($i/30)"
done

if ! lsof -i :3001 | grep -q LISTEN; then
  echo "❌ Server failed to start. Check logs at /tmp/api-server.log"
  exit 1
fi

echo ""
echo "Testing login endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"Morpheus@12"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  TOKEN=$(echo "$BODY" | jq -r '.token')
  echo "✅ Login successful!"
  echo "Token (first 80 chars): ${TOKEN:0:80}..."
  echo "$TOKEN" > /tmp/admin-token.txt
  echo "Full token saved to /tmp/admin-token.txt"
  
  echo ""
  echo "Testing AI Models endpoint..."
  curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:3001/api/v1/admin/ai/models | jq '.'
else
  echo "❌ Login failed!"
  echo "Response: $BODY"
fi

echo ""
echo "Server is still running with PID: $SERVER_PID"
echo "To stop it, run: kill $SERVER_PID"
echo "To view logs, run: tail -f /tmp/api-server.log"
