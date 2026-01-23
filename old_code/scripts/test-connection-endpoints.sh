#!/bin/bash

# Test script to check AI connection endpoints
# Gets admin token and lists all connections with their endpoints

set -e

API_URL="http://localhost:3001/api/v1"
ADMIN_EMAIL="admin@admin.com"
ADMIN_PASSWORD="admin123"

echo "🔐 Getting admin token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .accessToken // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get admin token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✓ Got admin token"
echo ""
echo "📋 Listing system connections..."
echo ""

curl -s -X GET "$API_URL/admin/ai/connections?limit=100" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.connections[] | {
    id: .id,
    name: .name,
    modelId: .modelId,
    endpoint: .endpoint,
    status: .status,
    isDefault: .isDefaultModel
  }' | head -100

echo ""
echo "Done!"
