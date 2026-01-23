#!/bin/bash

# Test Authentication Flow Migration
# This script tests that login and registration pages work correctly

echo "🧪 Testing Authentication Flow Migration"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3001"

# Check if servers are running
echo "1️⃣  Checking servers..."
if ! lsof -ti:3000 > /dev/null 2>&1; then
  echo -e "${RED}❌ Frontend not running on port 3000${NC}"
  echo "   Start with: cd services/frontend && pnpm dev"
  exit 1
fi

if ! lsof -ti:3001 > /dev/null 2>&1; then
  echo -e "${RED}❌ Main API not running on port 3001${NC}"
  echo "   Start with: cd services/main-api && pnpm dev"
  exit 1
fi

echo -e "${GREEN}✓ Frontend running on port 3000${NC}"
echo -e "${GREEN}✓ Main API running on port 3001${NC}"
echo ""

# Test 1: Frontend login page exists
echo "2️⃣  Testing Frontend Login Page..."
LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login)
if [ "$LOGIN_RESPONSE" = "200" ]; then
  echo -e "${GREEN}✓ Login page accessible at http://localhost:3000/login${NC}"
else
  echo -e "${RED}❌ Login page returned HTTP $LOGIN_RESPONSE${NC}"
fi
echo ""

# Test 2: Frontend register page exists
echo "3️⃣  Testing Frontend Register Page..."
REGISTER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/register)
if [ "$REGISTER_RESPONSE" = "200" ]; then
  echo -e "${GREEN}✓ Register page accessible at http://localhost:3000/register${NC}"
else
  echo -e "${RED}❌ Register page returned HTTP $REGISTER_RESPONSE${NC}"
fi
echo ""

# Test 3: Main API returns JSON
echo "4️⃣  Testing Main API /auth/login JSON response..."
AUTH_LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  -d '{"email":"nonexistent@example.com","password":"invalid"}')
if echo "$AUTH_LOGIN_RESPONSE" | grep -qi '<html'; then
  echo -e "${YELLOW}⚠️  Main API returned HTML for /auth/login${NC}"
else
  echo -e "${GREEN}✓ Main API /auth/login returns JSON${NC}"
fi
echo ""

# Test 4: Registration API works
echo "5️⃣  Testing Registration API..."
TEST_EMAIL="test-$(date +%s)@example.com"
REGISTER_API_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"Test123!\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"tenantId\": \"default\"
  }")

if echo "$REGISTER_API_RESPONSE" | jq -e '.userId' > /dev/null 2>&1; then
  USER_ID=$(echo "$REGISTER_API_RESPONSE" | jq -r '.userId')
  echo -e "${GREEN}✓ Registration API works (User ID: ${USER_ID:0:8}...)${NC}"
else
  echo -e "${RED}❌ Registration API failed${NC}"
  echo "$REGISTER_API_RESPONSE" | jq .
fi
echo ""

# Test 5: OAuth redirect to frontend
echo "6️⃣  Testing OAuth Redirect..."
OAUTH_REDIRECT=$(curl -s -I "$API_URL/oauth2/authorize?client_id=test" | grep -i "location:" | awk '{print $2}' | tr -d '\r')
if echo "$OAUTH_REDIRECT" | grep -q "localhost:3000/login"; then
  echo -e "${GREEN}✓ OAuth redirects to frontend login page${NC}"
  echo "  Location: $OAUTH_REDIRECT"
else
  echo -e "${YELLOW}⚠️  OAuth redirect location: $OAUTH_REDIRECT${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}✅ Migration Tests Complete!${NC}"
echo ""
echo "📋 Summary:"
echo "  - Frontend login page: http://localhost:3000/login"
echo "  - Frontend register page: http://localhost:3000/register"
echo "  - Main API: /auth/login returns JSON"
echo "  - OAuth flow: Redirects to frontend"
echo ""
echo "🎯 Next Steps:"
echo "  1. Test login flow in browser"
echo "  2. Test registration flow in browser"
echo "  3. Test OAuth complete flow"
echo "  4. Update any hardcoded legacy auth endpoints"
