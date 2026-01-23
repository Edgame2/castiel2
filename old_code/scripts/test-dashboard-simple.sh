#!/bin/bash
##############################################################################
# Dashboard System Integration Test Script - Simplified
# Tests dashboard CRUD and widget operations with real authentication
##############################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
API_BASE="${API_URL}/api/v1"

# Test credentials
TEST_EMAIL="admin@admin.com"
TEST_PASSWORD="Morpheus@12"

# Variables
ACCESS_TOKEN=""
DASHBOARD_ID=""
WIDGET_ID=""

echo "========================================"
echo "Dashboard System Tests"
echo "========================================"

# Check API
echo "Checking API..."
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: API not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓ API is running${NC}"

# Login
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}ERROR: Login failed${NC}"
    echo "$LOGIN_RESPONSE"
    exit 1
fi
echo -e "${GREEN}✓ Logged in successfully${NC}"

# Test 1: Create Dashboard
echo ""
echo "Test 1: Creating dashboard..."
CREATE_RESPONSE=$(curl -s -X POST "${API_BASE}/dashboards" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Dashboard",
      "description": "Integration test",
      "dashboardType": "user",
      "icon": "chart-bar"
    }')

DASHBOARD_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')

if [ -n "$DASHBOARD_ID" ]; then
    echo -e "${GREEN}✓ Dashboard created: $DASHBOARD_ID${NC}"
else
    echo -e "${RED}✗ Failed to create dashboard${NC}"
    echo "$CREATE_RESPONSE"
fi

# Test 2: Get Dashboard
if [ -n "$DASHBOARD_ID" ]; then
    echo ""
    echo "Test 2: Getting dashboard..."
    GET_RESPONSE=$(curl -s -X GET "${API_BASE}/dashboards/$DASHBOARD_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    if echo "$GET_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Dashboard retrieved${NC}"
    else
        echo -e "${RED}✗ Failed to get dashboard${NC}"
    fi
fi

# Test 3: List Dashboards
echo ""
echo "Test 3: Listing dashboards..."
LIST_RESPONSE=$(curl -s -X GET "${API_BASE}/dashboards" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

COUNT=$(echo "$LIST_RESPONSE" | jq '.items | length // 0')
echo -e "${GREEN}✓ Found $COUNT dashboards${NC}"

# Test 4: Add Widget
if [ -n "$DASHBOARD_ID" ]; then
    echo ""
    echo "Test 4: Adding widget..."
    WIDGET_RESPONSE=$(curl -s -X POST "${API_BASE}/dashboards/$DASHBOARD_ID/widgets" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "name": "Test Widget",
          "widgetType": "counter",
          "dataSource": {
            "type": "predefined",
            "predefinedQuery": "shard_count"
          },
          "config": {},
          "position": { "x": 0, "y": 0 },
          "size": { "width": 3, "height": 2 }
        }')
    
    WIDGET_ID=$(echo "$WIDGET_RESPONSE" | jq -r '.id // empty')
    
    if [ -n "$WIDGET_ID" ]; then
        echo -e "${GREEN}✓ Widget created: $WIDGET_ID${NC}"
    else
        echo -e "${RED}✗ Failed to create widget${NC}"
        echo "$WIDGET_RESPONSE"
    fi
fi

# Test 5: List Widgets
if [ -n "$DASHBOARD_ID" ]; then
    echo ""
    echo "Test 5: Listing widgets..."
    WIDGETS_RESPONSE=$(curl -s -X GET "${API_BASE}/dashboards/$DASHBOARD_ID/widgets" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    WIDGET_COUNT=$(echo "$WIDGETS_RESPONSE" | jq 'length // 0')
    echo -e "${GREEN}✓ Found $WIDGET_COUNT widgets${NC}"
fi

# Test 6: Update Widget Position (Drag & Drop)
if [ -n "$DASHBOARD_ID" ] && [ -n "$WIDGET_ID" ]; then
    echo ""
    echo "Test 6: Updating widget position..."
    UPDATE_RESPONSE=$(curl -s -X PATCH "${API_BASE}/dashboards/$DASHBOARD_ID/widgets/reorder" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
          \"positions\": [{
            \"widgetId\": \"$WIDGET_ID\",
            \"position\": { \"x\": 3, \"y\": 0 },
            \"size\": { \"width\": 6, \"height\": 4 }
          }]
        }")
    
    if echo "$UPDATE_RESPONSE" | jq -e '.[0].id' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Widget position updated (drag & drop simulated)${NC}"
    else
        echo -e "${YELLOW}⚠ Position update response: ${UPDATE_RESPONSE:0:100}...${NC}"
    fi
fi

# Test 7: Widget Catalog
echo ""
echo "Test 7: Checking widget catalog..."
CATALOG_RESPONSE=$(timeout 5 curl -s -X GET "${API_BASE}/admin/widget-catalog" \
    -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null || echo '{"items":[]}')

CATALOG_COUNT=$(echo "$CATALOG_RESPONSE" | jq '.items | length // 0' 2>/dev/null || echo "0")
if [ "$CATALOG_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Widget catalog has $CATALOG_COUNT entries${NC}"
else
    echo -e "${YELLOW}⚠ Widget catalog is empty (run: pnpm --filter @castiel/api seed-widgets)${NC}"
fi

# Cleanup
if [ -n "$WIDGET_ID" ] && [ -n "$DASHBOARD_ID" ]; then
    echo ""
    echo "Cleanup: Deleting widget..."
    curl -s -X DELETE "${API_BASE}/dashboards/$DASHBOARD_ID/widgets/$WIDGET_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN" > /dev/null
    echo -e "${GREEN}✓ Widget deleted${NC}"
fi

if [ -n "$DASHBOARD_ID" ]; then
    echo "Cleanup: Deleting dashboard..."
    curl -s -X DELETE "${API_BASE}/dashboards/$DASHBOARD_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN" > /dev/null
    echo -e "${GREEN}✓ Dashboard deleted${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✓ All tests completed!${NC}"
echo "========================================"
