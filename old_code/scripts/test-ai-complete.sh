#!/bin/bash

echo "=== Testing AI Features ==="
echo ""

# Get token
echo "1. Getting access token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"Morpheus@12"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Got access token"
echo ""

# Test list models (should be empty)
echo "2. Testing GET /api/v1/admin/ai/models..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/admin/ai/models | jq '.'
echo ""

# Test create model
echo "3. Testing POST /api/v1/admin/ai/models (create GPT-4o model)..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/admin/ai/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4o",
    "description": "OpenAI GPT-4 Optimized model for general use",
    "provider": "Azure",
    "type": "LLM",
    "hoster": "Azure",
    "allowTenantConnections": true,
    "contextWindow": 128000,
    "maxOutputs": 4096,
    "streaming": true,
    "vision": true,
    "functions": true,
    "jsonMode": true,
    "modelIdentifier": "gpt-4o",
    "pricing": {
      "inputTokenPrice": 0.00001,
      "outputTokenPrice": 0.00003,
      "currency": "USD"
    }
  }')

echo "$CREATE_RESPONSE" | jq '.'
MODEL_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')
echo ""

if [ "$MODEL_ID" != "null" ] && [ -n "$MODEL_ID" ]; then
  echo "✅ Model created with ID: $MODEL_ID"
  echo ""
  
  # Test get model by ID
  echo "4. Testing GET /api/v1/admin/ai/models/$MODEL_ID..."
  curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:3001/api/v1/admin/ai/models/$MODEL_ID" | jq '.'
  echo ""
  
  # Test list models again (should have 1)
  echo "5. Testing GET /api/v1/admin/ai/models (should show 1 model)..."
  curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:3001/api/v1/admin/ai/models | jq '.'
  echo ""
fi

# Test connections endpoint
echo "6. Testing GET /api/v1/admin/ai/connections..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/admin/ai/connections | jq '.'
echo ""

echo "=== Tests Complete ==="
