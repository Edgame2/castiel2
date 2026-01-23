#!/bin/bash

# API Test Runner Script
# Runs API tests sequentially to avoid rate limiting

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}API Test Runner${NC}"
echo -e "${GREEN}================================${NC}\n"

# Set environment variables
export USE_ADMIN_CREDENTIALS=true
export MAIN_API_URL=${MAIN_API_URL:-http://localhost:3001}

echo -e "${YELLOW}Configuration:${NC}"
echo "  API URL: $MAIN_API_URL"
echo "  Using Admin Credentials: $USE_ADMIN_CREDENTIALS"
echo ""

# Function to run tests with retry on rate limit
run_test_suite() {
    local test_file=$1
    local suite_name=$2
    
    echo -e "${YELLOW}Running $suite_name...${NC}"
    
    # Run the test suite
    pnpm vitest "$test_file" --run --reporter=verbose 2>&1 | tee /tmp/test-${suite_name}.log
    
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ $suite_name passed${NC}\n"
        return 0
    else
        # Check if it's a rate limit error
        if grep -q "Rate limit" /tmp/test-${suite_name}.log || grep -q "429" /tmp/test-${suite_name}.log; then
            echo -e "${YELLOW}⚠ Rate limited. Waiting 30 seconds before next suite...${NC}\n"
            sleep 30
            return 1
        else
            echo -e "${RED}✗ $suite_name failed${NC}\n"
            return 1
        fi
    fi
}

# Run test suites sequentially
echo -e "${YELLOW}Starting test execution...${NC}\n"

# 1. Authentication API Tests
run_test_suite "tests/auth-api.test.ts" "Authentication API"

# Wait a bit between suites to avoid rate limiting
sleep 5

# 2. Project API Tests  
run_test_suite "tests/project-api.test.ts" "Project API"

sleep 5

# 3. AI Insights API Tests
run_test_suite "tests/ai-insights-api.test.ts" "AI Insights API"

sleep 5

# 4. Integration API Tests
run_test_suite "tests/integration-api.test.ts" "Integration API"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}All test suites completed${NC}"
echo -e "${GREEN}================================${NC}"





