#!/bin/bash
# Complete Test Suite Runner
# Runs all tests with configuration checking and auto-fixing

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Complete Test Suite Runner${NC}"
echo -e "${BLUE}==============================${NC}"

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Step 1: Setup test environment
echo ""
echo -e "${YELLOW}Step 1: Setting up test environment...${NC}"
bash scripts/setup-test-environment.sh

# Step 2: Run configuration check
echo ""
echo -e "${YELLOW}Step 2: Checking configuration...${NC}"
cd apps/api
if [ -f "tests/utils/test-config-checker.ts" ]; then
  pnpm tsx tests/utils/test-config-checker.ts --check || echo -e "${RED}⚠️  Configuration check had issues${NC}"
else
  echo -e "${YELLOW}⏭️  Configuration checker not found, skipping...${NC}"
fi

# Step 3: Run auto-fixes
echo ""
echo -e "${YELLOW}Step 3: Applying auto-fixes...${NC}"
if [ -f "tests/utils/test-auto-fixer.ts" ]; then
  pnpm tsx tests/utils/test-auto-fixer.ts || echo -e "${RED}⚠️  Auto-fix had issues${NC}"
else
  echo -e "${YELLOW}⏭️  Auto-fixer not found, skipping...${NC}"
fi

# Step 4: Run master test suite (configuration validation)
echo ""
echo -e "${YELLOW}Step 4: Running master test suite (configuration validation)...${NC}"
pnpm test --run tests/suite/master-test-suite.ts || echo -e "${RED}⚠️  Master suite had issues${NC}"

# Step 5: Run unit tests
echo ""
echo -e "${YELLOW}Step 5: Running unit tests...${NC}"
if [ -d "tests/unit" ]; then
  pnpm test --run tests/unit || echo -e "${RED}⚠️  Some unit tests failed${NC}"
else
  echo -e "${YELLOW}⏭️  Unit tests directory not found${NC}"
fi

# Step 6: Run integration tests
echo ""
echo -e "${YELLOW}Step 6: Running integration tests...${NC}"
if [ -d "tests/integration" ]; then
  pnpm test --run tests/integration || echo -e "${RED}⚠️  Some integration tests failed${NC}"
else
  echo -e "${YELLOW}⏭️  Integration tests directory not found${NC}"
fi

# Step 7: Run E2E tests (if services are available)
echo ""
echo -e "${YELLOW}Step 7: Running E2E tests...${NC}"
if [ -n "$COSMOS_DB_ENDPOINT" ] && [ -n "$COSMOS_DB_KEY" ]; then
  if [ -d "tests/e2e" ] || [ -d "tests/embedding" ]; then
    pnpm test --run tests/embedding || echo -e "${RED}⚠️  Some E2E tests failed${NC}"
  else
    echo -e "${YELLOW}⏭️  E2E tests directory not found${NC}"
  fi
else
  echo -e "${YELLOW}⏭️  Skipping E2E tests (services not configured)${NC}"
  echo -e "   Set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY to run E2E tests"
fi

# Step 8: Generate coverage report
echo ""
echo -e "${YELLOW}Step 8: Generating coverage report...${NC}"
pnpm test:coverage || echo -e "${RED}⚠️  Coverage generation had issues${NC}"

# Step 9: Summary
echo ""
echo -e "${GREEN}✅ Test Suite Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Results:${NC}"
echo "   - Check test output above for details"
if [ -d "coverage" ]; then
  echo "   - Coverage report: apps/api/coverage/index.html"
fi
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "   - Review test failures above"
echo "   - Check coverage report for uncovered code"
echo "   - Fix any remaining issues"
echo ""



