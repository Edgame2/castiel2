#!/bin/bash
#
# Test Dashboard API directly
#

echo "Testing Dashboard API Endpoints"
echo "================================"
echo ""

API_URL="http://localhost:3001"

# Test 1: Health check
echo "1. Testing health endpoint..."
curl -s -w "\n[Response time: %{time_total}s]\n" "$API_URL/health"
echo ""

# Test 2: List dashboards without auth (should get 401)
echo "2. Testing list dashboards without auth (expecting 401)..."
curl -s -w "\n[Response time: %{time_total}s, HTTP code: %{http_code}]\n" \
  "$API_URL/api/v1/dashboards?type=user"
echo ""

# Test 3: Create dashboard without auth (should get 401)
echo "3. Testing create dashboard without auth (expecting 401)..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Dashboard"}' \
  -w "\n[Response time: %{time_total}s, HTTP code: %{http_code}]\n" \
  "$API_URL/api/v1/dashboards"
echo ""

echo "================================"
echo "All tests completed quickly (< 1s each)"
echo ""
echo "If web app is timing out, the issue is likely:"
echo "  1. Token validation is slow/timing out"
echo "  2. Frontend is hitting wrong URL"
echo "  3. CORS/network issue between frontend and API"
echo ""
echo "Check the API server terminal for log output like:"
echo "  [Dashboard Controller] listDashboards: ..."
echo "  [Dashboard Repo] listDashboards: ..."
echo ""
echo "If you don't see those logs when accessing from web app,"
echo "the request is not reaching the dashboard endpoints."
