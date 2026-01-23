#!/bin/bash

# Backup Verification Script
# Verifies that backups are configured and accessible for Cosmos DB and Redis

set -e

echo "🔍 Starting backup verification..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI not found. Please install Azure CLI.${NC}"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Cosmos DB Backup Verification
echo ""
echo "📦 Verifying Cosmos DB Backups..."

if [ -z "$COSMOS_DB_ENDPOINT" ]; then
    echo -e "${YELLOW}⚠️  COSMOS_DB_ENDPOINT not set. Skipping Cosmos DB verification.${NC}"
else
    # Extract account name from endpoint
    COSMOS_ACCOUNT=$(echo $COSMOS_DB_ENDPOINT | sed -n 's|https://\([^.]*\)\.documents\.azure\.com.*|\1|p')
    RESOURCE_GROUP="${COSMOS_RESOURCE_GROUP:-castiel-rg}"
    
    if [ -z "$COSMOS_ACCOUNT" ]; then
        echo -e "${YELLOW}⚠️  Could not extract Cosmos DB account name from endpoint.${NC}"
    else
        echo "  Account: $COSMOS_ACCOUNT"
        echo "  Resource Group: $RESOURCE_GROUP"
        
        # Check continuous backup status
        BACKUP_POLICY=$(az cosmosdb sql container show \
            --account-name "$COSMOS_ACCOUNT" \
            --database-name "${COSMOS_DB_DATABASE:-castiel}" \
            --name shards \
            --resource-group "$RESOURCE_GROUP" \
            --query "backupPolicy" 2>/dev/null || echo "null")
        
        if [ "$BACKUP_POLICY" != "null" ] && [ -n "$BACKUP_POLICY" ]; then
            echo -e "${GREEN}✅ Cosmos DB continuous backup is configured${NC}"
            
            # Check backup retention
            RETENTION=$(echo "$BACKUP_POLICY" | grep -o '"continuousModeProperties"[^}]*' | grep -o '"tier"[^,]*' || echo "")
            if [ -n "$RETENTION" ]; then
                echo "  Backup retention: $RETENTION"
            fi
        else
            echo -e "${RED}❌ Cosmos DB continuous backup not configured or not accessible${NC}"
            echo "  Action: Configure continuous backup in Azure Portal or Terraform"
        fi
        
        # Verify database exists
        DB_EXISTS=$(az cosmosdb sql database show \
            --account-name "$COSMOS_ACCOUNT" \
            --name "${COSMOS_DB_DATABASE:-castiel}" \
            --resource-group "$RESOURCE_GROUP" \
            --query "id" 2>/dev/null || echo "")
        
        if [ -n "$DB_EXISTS" ]; then
            echo -e "${GREEN}✅ Cosmos DB database exists${NC}"
        else
            echo -e "${RED}❌ Cosmos DB database not found${NC}"
        fi
    fi
fi

# Redis Backup Verification
echo ""
echo "📦 Verifying Redis Backups..."

if [ -z "$REDIS_URL" ] && [ -z "$REDIS_HOST" ]; then
    echo -e "${YELLOW}⚠️  Redis configuration not found. Skipping Redis verification.${NC}"
else
    # Extract Redis info
    if [ -n "$REDIS_URL" ]; then
        REDIS_HOST=$(echo $REDIS_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
        REDIS_PORT=$(echo $REDIS_URL | sed -n 's|.*://[^:]*:\([0-9]*\).*|\1|p')
    fi
    
    REDIS_HOST="${REDIS_HOST:-localhost}"
    REDIS_PORT="${REDIS_PORT:-6379}"
    
    echo "  Host: $REDIS_HOST"
    echo "  Port: $REDIS_PORT"
    
    # Check if Redis is accessible
    if command -v redis-cli &> /dev/null; then
        if [ -n "$REDIS_URL" ]; then
            REDIS_TEST=$(redis-cli -u "$REDIS_URL" ping 2>/dev/null || echo "FAILED")
        else
            REDIS_TEST=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null || echo "FAILED")
        fi
        
        if [ "$REDIS_TEST" = "PONG" ]; then
            echo -e "${GREEN}✅ Redis is accessible${NC}"
            
            # Check if RDB backup is enabled (for Azure Redis Cache)
            if echo "$REDIS_HOST" | grep -q "redis.cache.windows.net"; then
                echo "  Note: Azure Redis Cache backups are managed by Azure"
                echo "  Verify backup configuration in Azure Portal"
            else
                # For local Redis, check if RDB is configured
                echo "  Note: For local Redis, ensure RDB persistence is configured"
            fi
        else
            echo -e "${RED}❌ Redis is not accessible${NC}"
            echo "  Action: Check Redis connection and credentials"
        fi
    else
        echo -e "${YELLOW}⚠️  redis-cli not installed. Cannot test Redis connection.${NC}"
    fi
fi

# Summary
echo ""
echo "📊 Verification Summary:"
echo "  - Cosmos DB: Check status above"
echo "  - Redis: Check status above"
echo ""
echo "💡 Next Steps:"
echo "  1. Verify backups are running automatically"
echo "  2. Test restore procedures quarterly"
echo "  3. Monitor backup status in Azure Portal"
echo "  4. Document backup retention policies"
