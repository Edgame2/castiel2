#!/bin/bash
# Pre-testing checklist for User Management features

set -e

echo "======================================"
echo "User Management - Pre-Test Checklist"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
    if eval "$1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        echo -e "   ${YELLOW}Fix: $3${NC}"
        ((FAIL++))
        return 1
    fi
}

echo "Prerequisites:"
check "redis-cli ping" \
      "Redis is running" \
      "Start Redis: redis-server"

check "[ -f services/main-api/.env ]" \
      ".env file exists in main-api" \
      "Copy .env.example to .env: cp services/main-api/.env.example services/main-api/.env"

check "[ -f services/frontend/.env.local ]" \
      ".env.local file exists in frontend" \
      "Create .env.local with NEXT_PUBLIC_API_BASE_URL=http://localhost:3001"

check "command -v pnpm" \
      "pnpm is installed" \
      "Install pnpm: npm install -g pnpm"

echo ""
echo "Dependencies:"
check "[ -d services/main-api/node_modules ]" \
      "main-api dependencies installed" \
      "Run: cd services/main-api && pnpm install"

check "[ -d services/frontend/node_modules ]" \
      "frontend dependencies installed" \
      "Run: cd services/frontend && pnpm install"

echo ""
echo "Code Quality:"
check "cd services/frontend && pnpm type-check" \
      "Frontend TypeScript compiles" \
      "Fix TypeScript errors in services/frontend"

echo ""
echo "======================================"
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! ($PASS/$((PASS+FAIL)))${NC}"
    echo ""
    echo "Ready to start testing!"
    echo ""
    echo "Next steps:"
      echo "  1. Start services: ./scripts/start-test-services.sh"
      echo "  2. Run backend tests: cd services/main-api && pnpm test"
    echo "  3. Open frontend: http://localhost:3000"
    echo "  4. Follow testing guide: .github/docs/frontend/authentication/TESTING_GUIDE.md"
    exit 0
else
    echo -e "${RED}✗ $FAIL check(s) failed${NC} (Passed: $PASS/$((PASS+FAIL)))"
    echo ""
    echo "Please fix the issues above before testing."
    exit 1
fi
