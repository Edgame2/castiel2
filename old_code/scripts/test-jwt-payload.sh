#!/bin/bash

# Test token decoding
echo "🔍 Testing JWT Token Decoding"
echo "=============================="
echo ""

# Login and get token
echo "1️⃣  Logging in as gamelin.edouard@gmail.com..."
RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  -d '{
    "email": "gamelin.edouard@gmail.com",
    "password": "test",
    "tenantId": "default"
  }')

# Check if login was successful
if echo "$RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
  echo "✓ Login successful"
  echo ""
  
  # Extract token
  TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')
  
  # Decode JWT payload (second part between dots)
  PAYLOAD=$(echo "$TOKEN" | cut -d'.' -f2)
  
  echo "2️⃣  Decoded JWT Payload:"
  echo "$PAYLOAD" | base64 -d 2>/dev/null | jq '.'
  echo ""
  
  # Check if firstName and lastName are present
  DECODED=$(echo "$PAYLOAD" | base64 -d 2>/dev/null | jq -r '{email, firstName, lastName, sub}')
  echo "3️⃣  User Info in Token:"
  echo "$DECODED"
  echo ""
  
  FIRST_NAME=$(echo "$DECODED" | jq -r '.firstName // "NOT_PRESENT"')
  LAST_NAME=$(echo "$DECODED" | jq -r '.lastName // "NOT_PRESENT"')
  
  if [ "$FIRST_NAME" = "NOT_PRESENT" ] || [ "$FIRST_NAME" = "null" ]; then
    echo "❌ firstName is missing from JWT token"
    echo "   This means the main API hasn't reloaded with new changes"
    echo ""
    echo "🔧 Solution: Restart the main API to pick up JWT payload changes"
  else
    echo "✅ firstName found: $FIRST_NAME"
    echo "✅ lastName found: $LAST_NAME"
    echo ""
    echo "✅ JWT token contains user info correctly!"
  fi
else
  echo "❌ Login failed"
  echo "$RESPONSE" | jq '.'
  echo ""
  echo "Possible issues:"
  echo "  - Wrong password"
  echo "  - User not activated"
  echo "  - Main API not running"
fi
