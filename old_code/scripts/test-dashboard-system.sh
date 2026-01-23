#!/bin/bash
##############################################################################
# Dashboard System Integration Test Script
# Tests all dashboard CRUD operations, widget management, and DnD features
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
API_BASE="${API_URL}/api/v1"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test variables
DASHBOARD_ID=""
WIDGET_ID_1=""
WIDGET_ID_2=""
TEMPLATE_DASHBOARD_ID=""
ACCESS_TOKEN=""
USER_ID=""
TENANT_ID=""
TEST_EMAIL="admin@admin.com"
TEST_PASSWORD="Morpheus@12"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST:${NC} $1"
    ((TESTS_TOTAL++))
}

print_success() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((TESTS_PASSED++))
}

print_failure() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${BLUE}ℹ INFO:${NC} $1"
}

# Make API request
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=${4:-$ACCESS_TOKEN}
    
    local url="${API_BASE}${endpoint}"
    local response
    local http_code
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo "$body"
    return $http_code
##############################################################################
# Authentication Setup
##############################################################################

setup_auth() {
    print_header "Setting Up Authentication"
    
    print_test "Logging in as admin@admin.com"
    
    # Login with admin credentials
    local login_data=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)
    
    local login_response=$(curl -s -X POST "${API_BASE}/auth/login" \
        -H "Content-Type: application/json" \
        -d "$login_data" 2>&1)
    
    # Extract access token
    ACCESS_TOKEN=$(echo "$login_response" | jq -r '.accessToken // .access_token // empty' 2>/dev/null)
    USER_ID=$(echo "$login_response" | jq -r '.user.id // .userId // empty' 2>/dev/null)
    TENANT_ID=$(echo "$login_response" | jq -r '.user.tenantId // .tenantId // empty' 2>/dev/null)
    
    if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
        print_success "Authentication successful"
        print_info "User ID: $USER_ID"
        print_info "Tenant ID: $TENANT_ID"
        print_info "Token: ${ACCESS_TOKEN:0:20}..."
    else
        print_failure "Failed to authenticate"
        print_info "Response: $login_response"
        echo ""
        echo "Please verify:"
        echo "  - API is running: curl ${API_URL}/health"
        echo "  - Credentials are correct: $TEST_EMAIL / $TEST_PASSWORD"
        echo "  - User exists in database"
        exit 1
    fi
}

##############################################################################
# Dashboard CRUD Tests
##############################################################################

test_create_dashboard() {
    print_header "Testing Dashboard Creation"
    
    print_test "Create a new user dashboard"
    
    local dashboard_data=$(cat <<EOF
{
  "name": "Test Dashboard",
  "description": "Integration test dashboard",
  "dashboardType": "user",
  "icon": "chart-bar",
  "color": "#3b82f6",
  "gridConfig": {
    "columns": { "desktop": 12, "tablet": 8, "mobile": 4 },
    "rowHeight": 80,
    "gap": 16
  },
  "permissions": {
    "visibility": "private",
    "ownerId": "$USER_ID",
    "ownerType": "user"
  },
  "settings": {
    "autoRefresh": true,
    "refreshInterval": 300
  }
}
EOF
)
    
    local response=$(api_request POST "/dashboards" "$dashboard_data")
    local status=$?
    
    if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
        DASHBOARD_ID=$(echo "$response" | jq -r '.id')
        print_success "Dashboard created with ID: $DASHBOARD_ID"
    else
        print_failure "Failed to create dashboard: $response"
    fi
}

test_get_dashboard() {
    print_header "Testing Dashboard Retrieval"
    
    print_test "Get dashboard by ID"
    
    if [ -z "$DASHBOARD_ID" ]; then
        print_failure "No dashboard ID available"
        return
    fi
    
    local response=$(api_request GET "/dashboards/$DASHBOARD_ID")
    
    if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
        local name=$(echo "$response" | jq -r '.name')
        print_success "Retrieved dashboard: $name"
    else
        print_failure "Failed to retrieve dashboard: $response"
    fi
}

test_list_dashboards() {
    print_header "Testing Dashboard Listing"
    
    print_test "List all dashboards"
    
    local response=$(api_request GET "/dashboards")
    
    if echo "$response" | jq -e '.items' > /dev/null 2>&1; then
        local count=$(echo "$response" | jq '.items | length')
        print_success "Retrieved $count dashboards"
    else
        print_failure "Failed to list dashboards: $response"
    fi
}

test_update_dashboard() {
    print_header "Testing Dashboard Update"
    
    print_test "Update dashboard properties"
    
    if [ -z "$DASHBOARD_ID" ]; then
        print_failure "No dashboard ID available"
        return
    fi
    
    local update_data=$(cat <<EOF
{
  "name": "Updated Test Dashboard",
  "description": "Updated description",
  "color": "#10b981"
}
EOF
)
    
    local response=$(api_request PUT "/dashboards/$DASHBOARD_ID" "$update_data")
    
    if echo "$response" | jq -e '.name' > /dev/null 2>&1; then
        local name=$(echo "$response" | jq -r '.name')
        if [ "$name" = "Updated Test Dashboard" ]; then
            print_success "Dashboard updated successfully"
        else
            print_failure "Dashboard name not updated correctly"
        fi
    else
        print_failure "Failed to update dashboard: $response"
    fi
}

test_duplicate_dashboard() {
    print_header "Testing Dashboard Duplication"
    
    print_test "Duplicate existing dashboard"
    
    if [ -z "$DASHBOARD_ID" ]; then
        print_failure "No dashboard ID available"
        return
    fi
    
    local duplicate_data=$(cat <<EOF
{
  "name": "Duplicate Test Dashboard"
}
EOF
)
    
    local response=$(api_request POST "/dashboards/$DASHBOARD_ID/duplicate" "$duplicate_data")
    
    if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
        TEMPLATE_DASHBOARD_ID=$(echo "$response" | jq -r '.id')
        print_success "Dashboard duplicated with ID: $TEMPLATE_DASHBOARD_ID"
    else
        print_failure "Failed to duplicate dashboard: $response"
    fi
}

##############################################################################
# Widget Management Tests
##############################################################################

test_create_widget() {
    print_header "Testing Widget Creation"
    
    print_test "Add widget to dashboard"
    
    if [ -z "$DASHBOARD_ID" ]; then
        print_failure "No dashboard ID available"
        return
    fi
    
    local widget_data=$(cat <<EOF
{
  "name": "Test Counter Widget",
  "description": "Test counter",
  "widgetType": "counter",
  "dataSource": {
    "type": "predefined",
    "predefinedQuery": "shard_count"
  },
  "config": {
    "format": "number",
    "showTrend": true
  },
  "position": { "x": 0, "y": 0 },
  "size": { "width": 3, "height": 2 }
}
EOF
)
    
    local response=$(api_request POST "/dashboards/$DASHBOARD_ID/widgets" "$widget_data")
    
    if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
        WIDGET_ID_1=$(echo "$response" | jq -r '.id')
        print_success "Widget created with ID: $WIDGET_ID_1"
    else
        print_failure "Failed to create widget: $response"
    fi
}

test_create_second_widget() {
    print_header "Testing Second Widget Creation"
    
    print_test "Add another widget to dashboard"
    
    if [ -z "$DASHBOARD_ID" ]; then
        print_failure "No dashboard ID available"
        return
    fi
    
    local widget_data=$(cat <<EOF
{
  "name": "Test Chart Widget",
  "description": "Test chart",
  "widgetType": "chart",
  "dataSource": {
    "type": "predefined",
    "predefinedQuery": "shard_count_by_type"
  },
  "config": {
    "chartType": "bar",
    "showLegend": true
  },
  "position": { "x": 3, "y": 0 },
  "size": { "width": 6, "height": 4 }
}
EOF
)
    
    local response=$(api_request POST "/dashboards/$DASHBOARD_ID/widgets" "$widget_data")
    
    if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
        WIDGET_ID_2=$(echo "$response" | jq -r '.id')
        print_success "Second widget created with ID: $WIDGET_ID_2"
    else
        print_failure "Failed to create second widget: $response"
    fi
}

test_list_widgets() {
    print_header "Testing Widget Listing"
    
    print_test "List all widgets for dashboard"
    
    if [ -z "$DASHBOARD_ID" ]; then
        print_failure "No dashboard ID available"
        return
    fi
    
    local response=$(api_request GET "/dashboards/$DASHBOARD_ID/widgets")
    
    if echo "$response" | jq -e '. | type == "array"' > /dev/null 2>&1; then
        local count=$(echo "$response" | jq 'length')
        print_success "Retrieved $count widgets"
    else
        print_failure "Failed to list widgets: $response"
    fi
}

test_update_widget() {
    print_header "Testing Widget Update"
    
    print_test "Update widget configuration"
    
    if [ -z "$DASHBOARD_ID" ] || [ -z "$WIDGET_ID_1" ]; then
        print_failure "Dashboard or widget ID not available"
        return
    fi
    
    local update_data=$(cat <<EOF
{
  "name": "Updated Counter Widget",
  "config": {
    "format": "currency",
    "prefix": "$"
  }
}
EOF
)
    
    local response=$(api_request PUT "/dashboards/$DASHBOARD_ID/widgets/$WIDGET_ID_1" "$update_data")
    
    if echo "$response" | jq -e '.name' > /dev/null 2>&1; then
        print_success "Widget updated successfully"
    else
        print_failure "Failed to update widget: $response"
    fi
}

##############################################################################
# Widget Reordering and Resizing Tests
##############################################################################

test_batch_update_positions() {
    print_header "Testing Batch Widget Position Update (Drag & Drop)"
    
    print_test "Reorder and resize widgets"
    
    if [ -z "$DASHBOARD_ID" ] || [ -z "$WIDGET_ID_1" ] || [ -z "$WIDGET_ID_2" ]; then
        print_failure "Dashboard or widget IDs not available"
        return
    fi
    
    local positions_data=$(cat <<EOF
{
  "updates": [
    {
      "widgetId": "$WIDGET_ID_1",
      "position": { "x": 6, "y": 0 },
      "size": { "width": 4, "height": 3 }
    },
    {
      "widgetId": "$WIDGET_ID_2",
      "position": { "x": 0, "y": 0 },
      "size": { "width": 6, "height": 4 }
    }
  ]
}
EOF
)
    
    local response=$(api_request PUT "/dashboards/$DASHBOARD_ID/widgets/positions" "$positions_data")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        print_success "Widget positions updated (simulates drag & drop)"
    else
        print_failure "Failed to update widget positions: $response"
    fi
}

##############################################################################
# Permission Tests
##############################################################################

test_dashboard_permissions() {
    print_header "Testing Dashboard Permissions"
    
    print_test "Update dashboard permissions"
    
    if [ -z "$DASHBOARD_ID" ]; then
        print_failure "No dashboard ID available"
        return
    fi
    
    local permissions_data=$(cat <<EOF
{
  "permissions": {
    "visibility": "tenant",
    "roles": [
      { "role": "admin", "permission": "admin" },
      { "role": "user", "permission": "view" }
    ]
  }
}
EOF
)
    
    local response=$(api_request PUT "/dashboards/$DASHBOARD_ID" "$permissions_data")
    
    if echo "$response" | jq -e '.permissions' > /dev/null 2>&1; then
        print_success "Dashboard permissions updated"
    else
        print_failure "Failed to update permissions: $response"
    fi
}

##############################################################################
# Widget Catalog Tests
##############################################################################

test_list_widget_catalog() {
    print_header "Testing Widget Catalog"
    
    print_test "List available widget types from catalog"
    
    local response=$(api_request GET "/admin/widget-catalog")
    
    if echo "$response" | jq -e '.items' > /dev/null 2>&1; then
        local count=$(echo "$response" | jq '.items | length')
        print_success "Retrieved $count widget catalog entries"
        
        if [ "$count" -eq 0 ]; then
            print_info "Widget catalog is empty - needs seeding"
        fi
    else
        print_failure "Failed to list widget catalog: $response"
    fi
}

##############################################################################
# Cleanup Tests
##############################################################################

test_delete_widget() {
    print_header "Testing Widget Deletion"
    
    print_test "Delete widget from dashboard"
    
    if [ -z "$DASHBOARD_ID" ] || [ -z "$WIDGET_ID_1" ]; then
        print_failure "Dashboard or widget ID not available"
        return
    fi
    
    api_request DELETE "/dashboards/$DASHBOARD_ID/widgets/$WIDGET_ID_1" > /dev/null
    local status=$?
    
    if [ $status -eq 204 ] || [ $status -eq 200 ]; then
        print_success "Widget deleted successfully"
    else
        print_failure "Failed to delete widget (status: $status)"
    fi
}

test_delete_dashboard() {
    print_header "Testing Dashboard Deletion"
    
    print_test "Delete dashboard"
    
    if [ -z "$DASHBOARD_ID" ]; then
        print_failure "No dashboard ID available"
        return
    fi
    
    api_request DELETE "/dashboards/$DASHBOARD_ID" > /dev/null
    local status=$?
    
    if [ $status -eq 204 ] || [ $status -eq 200 ]; then
        print_success "Dashboard deleted successfully"
    else
        print_failure "Failed to delete dashboard (status: $status)"
    fi
    
    # Also delete the duplicate
    if [ -n "$TEMPLATE_DASHBOARD_ID" ]; then
        api_request DELETE "/dashboards/$TEMPLATE_DASHBOARD_ID" > /dev/null
    fi
}

##############################################################################
# Test Summary
##############################################################################

print_summary() {
    echo ""
    echo "========================================"
    echo "Test Summary"
    echo "========================================"
    echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
    echo -e "${RED}Failed:${NC} $TESTS_FAILED"
    echo "Total:  $TESTS_TOTAL"
    echo "========================================"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}✗ Some tests failed${NC}"
        exit 1
    fi
}

##############################################################################
# Main Execution
##############################################################################

main() {
    echo "========================================"
    echo "Dashboard System Integration Tests"
    echo "========================================"
    echo "API URL: $API_URL"
    echo ""
    
    # Check if API is running
    if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
        echo -e "${RED}ERROR: API is not running at $API_URL${NC}"
        echo "Please start the API server first: pnpm dev"
        exit 1
    fi
    
    # Run tests
    setup_auth
    
    # Dashboard CRUD
    test_create_dashboard
    test_get_dashboard
    test_list_dashboards
    test_update_dashboard
    test_duplicate_dashboard
    
    # Widget Management
    test_create_widget
    test_create_second_widget
    test_list_widgets
    test_update_widget
    
    # Drag & Drop Simulation
    test_batch_update_positions
    
    # Permissions
    test_dashboard_permissions
    
    # Widget Catalog
    test_list_widget_catalog
    
    # Cleanup
    test_delete_widget
    test_delete_dashboard
    
    # Summary
    print_summary
}

# Run main function
main
