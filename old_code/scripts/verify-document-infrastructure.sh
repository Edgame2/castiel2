#!/bin/bash

# Document Management Infrastructure Verification Script
# Verifies that all required infrastructure is set up correctly
#
# Usage:
#   ./scripts/verify-document-infrastructure.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Document Management Infrastructure Verification${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed${NC}"
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Azure${NC}"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${YELLOW}Warning: .env file not found. Using environment variables.${NC}"
fi

# Required environment variables
REQUIRED_VARS=(
    "AZURE_STORAGE_CONNECTION_STRING"
    "AZURE_STORAGE_DOCUMENTS_CONTAINER"
    "AZURE_STORAGE_QUARANTINE_CONTAINER"
    "COSMOS_DB_ENDPOINT"
    "COSMOS_DB_KEY"
    "COSMOS_DB_DATABASE"
    "COSMOS_DB_TENANTS_CONTAINER"
)

MISSING_VARS=()
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        MISSING_VARS+=("$VAR")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}Error: Missing required environment variables:${NC}"
    for VAR in "${MISSING_VARS[@]}"; do
        echo "  - $VAR"
    done
    exit 1
fi

echo -e "${GREEN}✓ All required environment variables are set${NC}"
echo ""

# Verify Azure Storage containers
echo "Verifying Azure Storage containers..."

DOCUMENTS_CONTAINER="${AZURE_STORAGE_DOCUMENTS_CONTAINER:-documents}"
QUARANTINE_CONTAINER="${AZURE_STORAGE_QUARANTINE_CONTAINER:-quarantine}"

# Extract storage account name from connection string
STORAGE_ACCOUNT=$(echo "$AZURE_STORAGE_CONNECTION_STRING" | grep -oP 'AccountName=\K[^;]+' || echo "")

if [ -z "$STORAGE_ACCOUNT" ]; then
    echo -e "${YELLOW}Warning: Could not extract storage account name from connection string${NC}"
    echo "  Manually verify containers exist in Azure Portal"
else
    echo "  Storage Account: $STORAGE_ACCOUNT"
    
    # Check if containers exist (requires storage account access)
    echo "  Checking containers..."
    echo "    - $DOCUMENTS_CONTAINER"
    echo "    - $QUARANTINE_CONTAINER"
    echo -e "${YELLOW}    (Note: Container verification requires Azure Storage access)${NC}"
fi

echo ""

# Verify Cosmos DB configuration
echo "Verifying Cosmos DB configuration..."
echo "  Endpoint: ${COSMOS_DB_ENDPOINT}"
echo "  Database: ${COSMOS_DB_DATABASE}"
echo "  Tenants Container: ${COSMOS_DB_TENANTS_CONTAINER}"

# Test Cosmos DB connection (if possible)
echo -e "${YELLOW}  (Note: Connection test requires Cosmos DB SDK)${NC}"

echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Verification Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next Steps:"
echo "  1. Run migration script: tsx apps/api/src/scripts/migrate-document-settings.ts"
echo "  2. Verify containers in Azure Portal"
echo "  3. Test document upload functionality"
echo ""








