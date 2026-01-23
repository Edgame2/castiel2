#!/bin/bash
##############################################################################
# Dashboard System - Quick Start Script
# This script will initialize and test the complete dashboard system
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Castiel Dashboard System - Quick Start        ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo ""

# Check if API is running
echo -e "${YELLOW}[1/4]${NC} Checking if API server is running..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API server is running"
else
    echo -e "${RED}✗${NC} API server is not running"
    echo -e "${YELLOW}Please start the API server first:${NC}"
    echo -e "  ${BLUE}cd apps/api && pnpm dev${NC}"
    exit 1
fi

# Seed dashboard shard types
echo ""
echo -e "${YELLOW}[2/4]${NC} Seeding dashboard shard types..."
cd apps/api
if pnpm seed-types > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Dashboard shard types seeded"
else
    echo -e "${YELLOW}⚠${NC} Shard types may already exist (this is OK)"
fi

# Seed widget catalog
echo ""
echo -e "${YELLOW}[3/4]${NC} Seeding widget catalog..."
if pnpm seed-widgets 2>&1 | grep -q "Seeded successfully"; then
    echo -e "${GREEN}✓${NC} Widget catalog seeded with default widgets"
else
    echo -e "${YELLOW}⚠${NC} Widgets may already exist (this is OK)"
fi

# Run tests
echo ""
echo -e "${YELLOW}[4/4]${NC} Running dashboard system tests..."
cd ../..
chmod +x scripts/test-dashboard-system.sh

if ./scripts/test-dashboard-system.sh; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ Dashboard System is Ready!                     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo -e "  1. Open your browser to: ${GREEN}http://localhost:3000/dashboards${NC}"
    echo -e "  2. Create a new dashboard"
    echo -e "  3. Add widgets by dragging from the catalog"
    echo -e "  4. Resize and reorder widgets as needed"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo -e "  ${YELLOW}DASHBOARD-IMPLEMENTATION-COMPLETE.md${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ Some tests failed                              ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Please check the error messages above${NC}"
    echo -e "${YELLOW}Common issues:${NC}"
    echo -e "  - Database not initialized: ${BLUE}pnpm --filter @castiel/api init-db${NC}"
    echo -e "  - Missing permissions: Check user roles"
    echo -e "  - Network issues: Verify API connectivity"
    exit 1
fi
