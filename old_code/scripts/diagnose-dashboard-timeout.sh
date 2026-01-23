#!/bin/bash
#
# Dashboard Timeout Diagnostic Script
# Checks all components involved in dashboard creation
#

set -e

echo "=========================================="
echo "🔍 Dashboard Creation Timeout Diagnostics"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to project root
cd "$(dirname "$0")"

echo "1️⃣  Checking Cosmos DB Connection..."
echo "----------------------------------------"

# Load env vars
source apps/api/.env 2>/dev/null || true

if [ -z "$COSMOS_DB_ENDPOINT" ]; then
    echo -e "${RED}❌ COSMOS_DB_ENDPOINT not set${NC}"
    exit 1
fi

echo "   Endpoint: $COSMOS_DB_ENDPOINT"
echo "   Database: $COSMOS_DB_DATABASE"
echo ""

# Check if key is set
if [ -z "$COSMOS_DB_KEY" ]; then
    echo -e "${RED}❌ COSMOS_DB_KEY not set${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Cosmos DB credentials configured${NC}"
fi

echo ""
echo "2️⃣  Checking Redis/Azure Cache Connection..."
echo "----------------------------------------"

if [ -z "$REDIS_HOST" ]; then
    echo -e "${RED}❌ REDIS_HOST not set${NC}"
else
    echo "   Host: $REDIS_HOST"
    echo "   Port: $REDIS_PORT"
    echo "   TLS: $REDIS_TLS"
    
    # Try to ping Redis
    echo "   Testing connection..."
    
    # Use nc (netcat) to test basic connectivity
    if command -v nc &> /dev/null; then
        if timeout 5 nc -zv $REDIS_HOST $REDIS_PORT 2>&1 | grep -q "succeeded\|Connected"; then
            echo -e "${GREEN}✅ Redis host is reachable${NC}"
        else
            echo -e "${RED}❌ Cannot reach Redis host${NC}"
            echo -e "${YELLOW}⚠️  This could cause 30s timeouts if the dashboard service tries to connect to Redis${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  nc (netcat) not installed, skipping connectivity test${NC}"
    fi
fi

echo ""
echo "3️⃣  Checking Cosmos DB Containers..."
echo "----------------------------------------"

# Run init script to verify containers
if pnpm --filter @castiel/api run init-db 2>&1 | tail -5; then
    echo -e "${GREEN}✅ Cosmos DB containers are initialized${NC}"
else
    echo -e "${RED}❌ Error checking containers${NC}"
fi

echo ""
echo "4️⃣  Checking API Server Status..."
echo "----------------------------------------"

# Check if API is running
if pgrep -f "tsx.*src/index.ts" > /dev/null; then
    echo -e "${GREEN}✅ API server is running${NC}"
    
    # Try to check health endpoint
    if command -v curl &> /dev/null; then
        echo "   Testing health endpoint..."
        if curl -s http://localhost:3001/health | jq . 2>/dev/null; then
            echo -e "${GREEN}✅ API is responding${NC}"
        else
            echo -e "${YELLOW}⚠️  API might not be responding on expected port${NC}"
        fi
    fi
else
    echo -e "${RED}❌ API server is NOT running${NC}"
    echo ""
    echo "   To start the API server:"
    echo "   cd apps/api && pnpm dev"
fi

echo ""
echo "5️⃣  Seeding Status Check..."
echo "----------------------------------------"

# Check if we have a test tenant
echo "   Checking for test tenant data..."
echo "   (Run: pnpm --filter @castiel/api tsx scripts/seed-cosmos-db.ts to seed data)"

echo ""
echo "=========================================="
echo "📋 SUMMARY & RECOMMENDATIONS"
echo "=========================================="
echo ""

# Redis timeout warning
if [ ! -z "$REDIS_HOST" ] && [ "$REDIS_HOST" != "localhost" ]; then
    echo -e "${YELLOW}⚠️  POTENTIAL ISSUE FOUND:${NC}"
    echo ""
    echo "Your Redis is configured to use Azure Cache:"
    echo "   Host: $REDIS_HOST"
    echo ""
    echo "If Azure Cache is unreachable or slow, this can cause:"
    echo "   • 30-second timeouts (matching your error)"
    echo "   • Dashboard creation to hang"
    echo "   • API to become unresponsive"
    echo ""
    echo "RECOMMENDED FIXES:"
    echo ""
    echo "Option 1: Switch to local Redis for development"
    echo "   1. Edit apps/api/.env:"
    echo "      REDIS_HOST=localhost"
    echo "      REDIS_PORT=6379"
    echo "      REDIS_TLS=false"
    echo "      REDIS_PASSWORD="
    echo ""
    echo "   2. Start local Redis:"
    echo "      docker run -d -p 6379:6379 redis:alpine"
    echo ""
    echo "   3. Restart API server"
    echo ""
    echo "Option 2: Fix Azure Cache connectivity"
    echo "   1. Verify firewall rules allow connection from your IP"
    echo "   2. Check if Redis password is correct"
    echo "   3. Verify TLS settings match Azure requirements"
    echo ""
    echo "Option 3: Disable caching temporarily"
    echo "   1. Check if dashboard service has a fallback mode"
    echo "   2. API should work without Redis but may be slower"
    echo ""
fi

echo ""
echo "QUICK FIXES TO TRY:"
echo ""
echo "1. Start/Restart API server:"
echo "   cd apps/api && pnpm dev"
echo ""
echo "2. Seed the database if not done:"
echo "   pnpm --filter @castiel/api tsx ../../scripts/seed-cosmos-db.ts"
echo ""
echo "3. Test the API health endpoint:"
echo "   curl http://localhost:3001/health"
echo ""
echo "4. Check API logs for Redis connection errors"
echo ""
echo "=========================================="
