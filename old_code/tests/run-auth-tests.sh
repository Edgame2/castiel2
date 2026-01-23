#!/bin/bash

# Authentication Test Runner
# This script sets up the environment and runs the authentication tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "Authentication Test Suite Runner"
echo "=================================="
echo ""

# Check if services are running
check_service() {
    local url=$1
    local name=$2
    
    echo -n "Checking $name... "
    
    if curl -s -o /dev/null -w "%{http_code}" "$url/health" | grep -q "200"; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not running${NC}"
        return 1
    fi
}

# Load test environment
if [ -f "./tests/.env.test" ]; then
    echo "Loading test environment..."
    export $(cat ./tests/.env.test | grep -v '^#' | xargs)
fi

MAIN_API_URL=${MAIN_API_URL:-http://localhost:3001}

echo ""
echo "Service URLs:"
echo "  Main API: $MAIN_API_URL"
echo ""

# Check if services are running
SERVICES_RUNNING=true

if ! check_service "$MAIN_API_URL" "Main API"; then
    SERVICES_RUNNING=false
fi

echo ""

if [ "$SERVICES_RUNNING" = false ]; then
    echo -e "${YELLOW}Warning: Some services are not running${NC}"
    echo "You can start services with: pnpm dev"
    echo ""
    read -p "Continue with tests anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Parse command line arguments
TEST_PATTERN=""
COVERAGE=false
WATCH=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage)
            COVERAGE=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            export VERBOSE=true
            shift
            ;;
        -t|--test)
            TEST_PATTERN="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--coverage] [--watch] [--verbose] [-t|--test <pattern>]"
            exit 1
            ;;
    esac
done

# Build test command
TEST_CMD="pnpm test tests/auth-email-password.test.ts"

if [ "$COVERAGE" = true ]; then
    TEST_CMD="pnpm test:coverage tests/auth-email-password.test.ts"
fi

if [ "$WATCH" = true ]; then
    TEST_CMD="pnpm test:watch tests/auth-email-password.test.ts"
fi

if [ -n "$TEST_PATTERN" ]; then
    TEST_CMD="$TEST_CMD -t \"$TEST_PATTERN\""
fi

# Run tests
echo "Running tests..."
echo "Command: $TEST_CMD"
echo ""

eval $TEST_CMD

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
