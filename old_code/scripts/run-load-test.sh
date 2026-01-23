#!/bin/bash

# Load Test Runner Script
# Runs k6 load tests with proper configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
TEST_TYPE="${TEST_TYPE:-normal}"
API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-stdout}"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed${NC}"
    echo "Install k6: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if API is accessible
if ! curl -s -f "${API_BASE_URL}/health" > /dev/null; then
    echo -e "${RED}❌ API is not accessible at ${API_BASE_URL}${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 Starting ${TEST_TYPE} load test...${NC}"
echo "API Base URL: ${API_BASE_URL}"
echo "Test Type: ${TEST_TYPE}"
echo ""

# Set output file
OUTPUT_FILE="load-test-results-$(date +%Y%m%d-%H%M%S).json"

# Build k6 command
K6_CMD="k6 run --env TEST_TYPE=${TEST_TYPE} --env API_BASE_URL=${API_BASE_URL}"

# Add environment variables if set
if [ -n "${TEST_USER_EMAIL}" ]; then
    K6_CMD="${K6_CMD} --env TEST_USER_EMAIL=${TEST_USER_EMAIL}"
fi

if [ -n "${TEST_USER_PASSWORD}" ]; then
    K6_CMD="${K6_CMD} --env TEST_USER_PASSWORD=${TEST_USER_PASSWORD}"
fi

if [ -n "${TEST_TENANT_ID}" ]; then
    K6_CMD="${K6_CMD} --env TEST_TENANT_ID=${TEST_TENANT_ID}"
fi

# Add output based on format
if [ "${OUTPUT_FORMAT}" = "json" ]; then
    K6_CMD="${K6_CMD} --out json=${OUTPUT_FILE}"
    echo "Results will be saved to: ${OUTPUT_FILE}"
elif [ "${OUTPUT_FORMAT}" = "cloud" ]; then
    K6_CMD="${K6_CMD} cloud"
    echo "Results will be uploaded to k6 Cloud"
fi

# Add test file
K6_CMD="${K6_CMD} tests/load/k6-scenarios-enhanced.js"

# Run the test
echo ""
echo -e "${YELLOW}Running load test...${NC}"
echo ""

eval ${K6_CMD}

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Load test completed successfully${NC}"
    
    if [ "${OUTPUT_FORMAT}" = "json" ]; then
        echo "Results saved to: ${OUTPUT_FILE}"
        echo "Analyze results with: k6 stats ${OUTPUT_FILE}"
    fi
else
    echo ""
    echo -e "${RED}❌ Load test failed${NC}"
    exit 1
fi
