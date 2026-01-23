#!/bin/bash
# Comprehensive Implementation Verification Script
# 
# Verifies that all implementation fixes are working correctly:
# - CosmosDB containers are properly configured
# - Routes are registered
# - API endpoints are accessible
# - Frontend-backend integration is working
#
# Usage:
#   ./scripts/verify-implementation.sh [--api-url URL] [--skip-containers] [--skip-api]

# Don't exit on error - we want to report all issues
set +e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
SKIP_CONTAINERS=false
SKIP_API=false
SKIP_ROUTES=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --api-url)
      API_URL="$2"
      shift 2
      ;;
    --skip-containers)
      SKIP_CONTAINERS=true
      shift
      ;;
    --skip-api)
      SKIP_API=true
      shift
      ;;
    --skip-routes)
      SKIP_ROUTES=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--api-url URL] [--skip-containers] [--skip-api] [--skip-routes]"
      exit 1
      ;;
  esac
done

PASS=0
FAIL=0
SKIP=0

check() {
    local name="$1"
    local command="$2"
    local fix_hint="$3"
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} $name"
        if [ -n "$fix_hint" ]; then
            echo -e "   ${YELLOW}Hint: $fix_hint${NC}"
        fi
        ((FAIL++))
        return 1
    fi
}

skip() {
    local name="$1"
    echo -e "${BLUE}⊘${NC} $name (skipped)"
    ((SKIP++))
}

echo "======================================"
echo "Implementation Verification Script"
echo "======================================"
echo ""
echo "API URL: $API_URL"
echo ""

# ============================================================================
# 1. Container Configuration Verification
# ============================================================================
if [ "$SKIP_CONTAINERS" = false ]; then
    echo -e "${BLUE}1. Container Configuration${NC}"
    echo "--------------------------------------"
    
    check "Container verification script exists" \
          "[ -f apps/api/src/scripts/verify-containers.ts ]" \
          "Container verification script should exist"
    
    check "Container init script exists" \
          "[ -f apps/api/src/scripts/init-cosmos-db.ts ]" \
          "Container init script should exist"
    
    # Run container verification if possible
    if command -v pnpm > /dev/null 2>&1 && [ -f apps/api/package.json ]; then
        if pnpm --filter @castiel/api run verify:containers > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Container configuration is aligned"
            ((PASS++))
        else
            echo -e "${YELLOW}⚠${NC} Container configuration may have issues (run 'pnpm --filter @castiel/api run verify:containers' for details)"
            ((FAIL++))
        fi
    else
        skip "Container verification (pnpm not available)"
    fi
    
    echo ""
else
    echo -e "${BLUE}1. Container Configuration${NC} (skipped)"
    echo ""
fi

# ============================================================================
# 2. Route Registration Verification
# ============================================================================
if [ "$SKIP_ROUTES" = false ]; then
    echo -e "${BLUE}2. Route Registration${NC}"
    echo "--------------------------------------"
    
    check "Routes index file exists" \
          "[ -f apps/api/src/routes/index.ts ]" \
          "Routes index file should exist"
    
    # Check for MFA audit routes
    if grep -q "mfa-audit.routes" apps/api/src/routes/index.ts 2>/dev/null; then
        echo -e "${GREEN}✓${NC} MFA audit routes are registered"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} MFA audit routes may not be registered"
        ((FAIL++))
    fi
    
    # Check for collaborative insights routes
    if grep -q "collaborative-insights" apps/api/src/routes/index.ts 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Collaborative insights routes are registered"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} Collaborative insights routes may not be registered"
        ((FAIL++))
    fi
    
    echo ""
else
    echo -e "${BLUE}2. Route Registration${NC} (skipped)"
    echo ""
fi

# ============================================================================
# 3. Frontend API Integration Verification
# ============================================================================
echo -e "${BLUE}3. Frontend API Integration${NC}"
echo "--------------------------------------"

# Check if hardcoded URLs were replaced
check "WebhooksManager uses apiClient" \
      "! grep -q 'http://localhost:3001' apps/web/src/components/WebhooksManager.tsx 2>/dev/null || grep -q 'apiClient' apps/web/src/components/WebhooksManager.tsx 2>/dev/null" \
      "WebhooksManager should use apiClient instead of hardcoded URLs"

check "NotificationCenter uses apiClient" \
      "! grep -q 'http://localhost:3001' apps/web/src/components/NotificationCenter.tsx 2>/dev/null || grep -q 'apiClient\|notificationApi' apps/web/src/components/NotificationCenter.tsx 2>/dev/null" \
      "NotificationCenter should use apiClient or notificationApi"

check "Settings uses apiClient" \
      "! grep -q 'http://localhost:3001' apps/web/src/components/Settings.tsx 2>/dev/null || grep -q 'apiClient' apps/web/src/components/Settings.tsx 2>/dev/null" \
      "Settings should use apiClient instead of hardcoded URLs"

check "APIKeyManagement uses apiClient" \
      "! grep -q 'http://localhost:3001' apps/web/src/components/APIKeyManagement.tsx 2>/dev/null || grep -q 'apiClient' apps/web/src/components/APIKeyManagement.tsx 2>/dev/null" \
      "APIKeyManagement should use apiClient instead of hardcoded URLs"

check "AuditLogViewer uses apiClient" \
      "! grep -q 'http://localhost:3001' apps/web/src/components/AuditLogViewer.tsx 2>/dev/null || grep -q 'apiClient' apps/web/src/components/AuditLogViewer.tsx 2>/dev/null" \
      "AuditLogViewer should use apiClient instead of hardcoded URLs"

check "ReportsExport uses apiClient" \
      "! grep -q 'http://localhost:3001' apps/web/src/components/ReportsExport.tsx 2>/dev/null || grep -q 'apiClient' apps/web/src/components/ReportsExport.tsx 2>/dev/null" \
      "ReportsExport should use apiClient instead of hardcoded URLs"

# Check insights.ts for /api/v1 prefixes
if grep -q "/api/v1/insights" apps/web/src/lib/api/insights.ts 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Insights API calls use /api/v1 prefix"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} Some insights API calls may be missing /api/v1 prefix"
    ((FAIL++))
fi

echo ""

# ============================================================================
# 4. API Endpoint Availability (if API is running)
# ============================================================================
if [ "$SKIP_API" = false ]; then
    echo -e "${BLUE}4. API Endpoint Availability${NC}"
    echo "--------------------------------------"
    
    # Check if API is running
    if curl -s -f "$API_URL/health" > /dev/null 2>&1 || \
       curl -s -f "$API_URL/api/health" > /dev/null 2>&1 || \
       curl -s -f "$API_URL/api/v1/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} API server is running"
        ((PASS++))
        
        # Test key endpoints
        check "Health endpoint accessible" \
              "curl -s -f '$API_URL/health' > /dev/null 2>&1 || curl -s -f '$API_URL/api/health' > /dev/null 2>&1 || curl -s -f '$API_URL/api/v1/health' > /dev/null 2>&1" \
              "API health endpoint should be accessible"
        
        # Note: Most endpoints require authentication, so we can't test them without credentials
        echo -e "${BLUE}ℹ${NC}  Most API endpoints require authentication (not tested)"
        
    else
        echo -e "${YELLOW}⚠${NC} API server does not appear to be running at $API_URL"
        echo -e "   ${YELLOW}Hint: Start the API with 'cd apps/api && pnpm dev'${NC}"
        ((SKIP++))
    fi
    
    echo ""
else
    echo -e "${BLUE}4. API Endpoint Availability${NC} (skipped)"
    echo ""
fi

# ============================================================================
# 5. TypeScript Compilation
# ============================================================================
echo -e "${BLUE}5. TypeScript Compilation${NC}"
echo "--------------------------------------"

if command -v pnpm > /dev/null 2>&1 && [ -f apps/api/package.json ]; then
    # Check if typecheck script exists
    if grep -q '"typecheck"' apps/api/package.json 2>/dev/null; then
        echo -e "${BLUE}ℹ${NC}  Run 'cd apps/api && pnpm run typecheck' to verify TypeScript compilation"
        skip "TypeScript compilation check (run manually)"
    else
        skip "TypeScript compilation check (typecheck script not found)"
    fi
else
    skip "TypeScript compilation check (pnpm not available)"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo "======================================"
TOTAL=$((PASS + FAIL + SKIP))
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ Verification Complete!${NC}"
    echo ""
    echo "Results:"
    echo -e "  ${GREEN}Passed: $PASS${NC}"
    echo -e "  ${RED}Failed: $FAIL${NC}"
    echo -e "  ${BLUE}Skipped: $SKIP${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Initialize containers: cd apps/api && pnpm run init-db"
    echo "  2. Start API: cd apps/api && pnpm dev"
    echo "  3. Start Web: cd apps/web && pnpm dev"
    echo "  4. Run integration tests: pnpm test"
    exit 0
else
    echo -e "${YELLOW}⚠ Verification Complete with Issues${NC}"
    echo ""
    echo "Results:"
    echo -e "  ${GREEN}Passed: $PASS${NC}"
    echo -e "  ${RED}Failed: $FAIL${NC}"
    echo -e "  ${BLUE}Skipped: $SKIP${NC}"
    echo ""
    echo "Please review the failed checks above."
    exit 1
fi

