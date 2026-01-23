#!/bin/bash

# Activate User Account
# Usage: ./activate-user.sh <email>

if [ -z "$1" ]; then
  echo "Usage: ./activate-user.sh <email>"
  echo "Example: ./activate-user.sh user@example.com"
  exit 1
fi

EMAIL="$1"
TENANT_ID="${2:-default}"
API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"

echo "🔍 Looking for user: $EMAIL"

# Find user by email
USER_DATA=$(curl -s "$API_BASE_URL/api/tenants/$TENANT_ID/users" -H "X-Tenant-ID: $TENANT_ID")
USER_ID=$(echo "$USER_DATA" | jq -r ".users[] | select(.email == \"$EMAIL\") | .id")

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
  echo "❌ User not found: $EMAIL"
  exit 1
fi

echo "✓ Found user ID: $USER_ID"

# Get current status
CURRENT_STATUS=$(echo "$USER_DATA" | jq -r ".users[] | select(.email == \"$EMAIL\") | .status")
echo "Current status: $CURRENT_STATUS"

if [ "$CURRENT_STATUS" = "active" ]; then
  echo "✓ User is already active"
  exit 0
fi

echo "🔧 Activating user..."

# Activate user
RESULT=$(curl -s -X PATCH "$API_BASE_URL/api/tenants/$TENANT_ID/users/$USER_ID" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "status": "active",
    "emailVerified": true
  }')

NEW_STATUS=$(echo "$RESULT" | jq -r '.status')

if [ "$NEW_STATUS" = "active" ]; then
  echo "✅ User activated successfully!"
  echo ""
  echo "User can now log in at: http://localhost:3000/login"
  echo "Email: $EMAIL"
else
  echo "❌ Failed to activate user"
  echo "$RESULT" | jq .
  exit 1
fi
