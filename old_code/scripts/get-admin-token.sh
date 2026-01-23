#!/bin/bash

# Quick script to get an admin JWT token for testing
# Usage: ./scripts/get-admin-token.sh <email> <password>

API_URL="${API_URL:-http://localhost:3001}"
EMAIL="${1:-admin@admin.com}"
PASSWORD="${2:-Morpheus@12}"

echo "🔐 Getting admin JWT token..."
echo "API: $API_URL"
echo "Email: $EMAIL"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

# Check if login was successful
if echo "$RESPONSE" | jq -e '.accessToken' > /dev/null 2>&1; then
  ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.accessToken')
  REFRESH_TOKEN=$(echo "$RESPONSE" | jq -r '.refreshToken')
  USER=$(echo "$RESPONSE" | jq -r '.user.email')
  
  echo "✅ Login successful!"
  echo ""
  echo "User: $USER"
  echo ""
  echo "📋 Access Token (copy this for API calls):"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "$ACCESS_TOKEN"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "💡 Usage in curl:"
  echo "curl -H \"Authorization: Bearer $ACCESS_TOKEN\" ..."
  echo ""
  echo "💡 Export as environment variable:"
  echo "export ADMIN_JWT_TOKEN=\"$ACCESS_TOKEN\""
  echo ""
  echo "💡 Use in test script:"
  echo "ADMIN_JWT_TOKEN=\"$ACCESS_TOKEN\" pnpm tsx scripts/test-ai-features.ts"
  echo ""
  echo "🔄 Refresh Token:"
  echo "$REFRESH_TOKEN"
  echo ""
else
  echo "❌ Login failed!"
  echo ""
  echo "Response:"
  echo "$RESPONSE" | jq '.'
  echo ""
  echo "Possible issues:"
  echo "1. API server not running (start with: pnpm --filter @castiel/api dev)"
  echo "2. Wrong credentials"
  echo "3. User doesn't exist (create with setup scripts)"
  echo ""
  exit 1
fi
