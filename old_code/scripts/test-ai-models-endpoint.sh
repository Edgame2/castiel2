#!/bin/bash

# Simple test for AI models endpoint

API_URL="http://localhost:3001"
EMAIL="admin@admin.com"
PASSWORD="Morpheus@12"

echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo "Token (first 50 chars): ${TOKEN:0:50}..."
echo ""

echo "📋 Testing GET /api/v1/admin/ai/models..."
MODELS_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/admin/ai/models" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$MODELS_RESPONSE" | jq '.'
echo ""

# Check if it's an error
if echo "$MODELS_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "❌ Request failed with error"
  exit 1
elif echo "$MODELS_RESPONSE" | jq -e '.models' > /dev/null 2>&1; then
  MODEL_COUNT=$(echo "$MODELS_RESPONSE" | jq '.models | length')
  echo "✅ Request successful! Found $MODEL_COUNT models"
  exit 0
else
  echo "⚠️  Unexpected response format"
  exit 1
fi
