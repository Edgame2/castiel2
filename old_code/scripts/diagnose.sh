#!/bin/bash

# Castiel Diagnostic Script
# Checks the status of all required services

echo "==================================="
echo "Castiel Service Diagnostic Report"
echo "==================================="
echo ""

# Check if API server is running
echo "1. API Server Status:"
if pgrep -f "tsx.*apps/api" > /dev/null || pgrep -f "node.*apps/api" > /dev/null; then
    echo "   ✅ API server is running"
    API_PID=$(pgrep -f "tsx.*apps/api" || pgrep -f "node.*apps/api")
    echo "   PID: $API_PID"
else
    echo "   ❌ API server is NOT running"
fi
echo ""

# Check if Web/Frontend server is running
echo "2. Web Server Status:"
if pgrep -f "next dev" > /dev/null || pgrep -f "node.*apps/web" > /dev/null; then
    echo "   ✅ Web server is running"
    WEB_PID=$(pgrep -f "next dev" || pgrep -f "node.*apps/web")
    echo "   PID: $WEB_PID"
else
    echo "   ❌ Web server is NOT running"
fi
echo ""

# Check Docker
echo "3. Docker Status:"
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        echo "   ✅ Docker is running"
        
        # Check for Cosmos DB emulator
        if docker ps | grep -q "cosmos\|cosmosdb"; then
            echo "   ✅ Cosmos DB container found"
        else
            echo "   ⚠️  No Cosmos DB container running"
        fi
        
        # Check for Redis
        if docker ps | grep -q "redis"; then
            echo "   ✅ Redis container found"
        else
            echo "   ⚠️  No Redis container running"
        fi
    else
        echo "   ❌ Docker daemon is NOT running"
    fi
else
    echo "   ❌ Docker is NOT installed"
fi
echo ""

# Check .env file
echo "4. Configuration Status:"
if [ -f "apps/api/.env" ]; then
    echo "   ✅ API .env file exists"
    
    # Check for critical variables
    if grep -q "COSMOS_DB_ENDPOINT" apps/api/.env && grep -q "COSMOS_DB_KEY" apps/api/.env; then
        COSMOS_ENDPOINT=$(grep "COSMOS_DB_ENDPOINT" apps/api/.env | cut -d'=' -f2)
        echo "   Cosmos DB: $COSMOS_ENDPOINT"
    else
        echo "   ⚠️  Cosmos DB credentials missing"
    fi
    
    if grep -q "REDIS_HOST" apps/api/.env && grep -q "REDIS_PASSWORD" apps/api/.env; then
        REDIS_HOST=$(grep "REDIS_HOST" apps/api/.env | cut -d'=' -f2)
        echo "   Redis: $REDIS_HOST"
    else
        echo "   ⚠️  Redis credentials missing"
    fi
else
    echo "   ❌ API .env file NOT found"
fi
echo ""

# Check ports
echo "5. Port Status:"
if command -v lsof &> /dev/null; then
    if lsof -i :3001 &> /dev/null; then
        echo "   Port 3001 (API): IN USE"
    else
        echo "   Port 3001 (API): AVAILABLE"
    fi
    
    if lsof -i :3000 &> /dev/null; then
        echo "   Port 3000 (Web): IN USE"
    else
        echo "   Port 3000 (Web): AVAILABLE"
    fi
else
    echo "   ⚠️  lsof command not available, cannot check ports"
fi
echo ""

# Recommendations
echo "==================================="
echo "Recommendations:"
echo "==================================="

if ! pgrep -f "tsx.*apps/api" > /dev/null && ! pgrep -f "node.*apps/api" > /dev/null; then
    echo ""
    echo "🔧 Start the API server:"
    echo "   pnpm dev:api"
    echo "   OR"
    echo "   pnpm dev  (starts both API and Web)"
fi

if ! docker info &> /dev/null; then
    echo ""
    echo "🔧 Start Docker:"
    echo "   sudo systemctl start docker"
    echo "   OR open Docker Desktop"
fi

echo ""
echo "==================================="
echo "For Azure services (Cosmos DB & Redis):"
echo "  - Verify credentials in apps/api/.env"
echo "  - Check Azure Portal for service status"
echo "  - Verify firewall rules allow your IP"
echo ""
echo "For local development:"
echo "  - Use Cosmos DB Emulator (Docker)"
echo "  - Use local Redis (Docker)"
echo "==================================="
