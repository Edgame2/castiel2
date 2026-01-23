#!/bin/bash

echo "=========================================="
echo "Switching to Local Development Environment"
echo "=========================================="
echo ""

# Step 1: Backup current .env
if [ -f "apps/api/.env" ]; then
    echo "📋 Backing up current .env to .env.azure..."
    cp apps/api/.env apps/api/.env.azure
    echo "   ✅ Backup saved"
else
    echo "⚠️  No .env file found"
fi

# Step 2: Copy mock .env for local development
echo ""
echo "📝 Setting up local development .env..."
cp apps/api/.env.mock apps/api/.env
echo "   ✅ Local .env configured"

# Step 3: Start Docker if not running
echo ""
echo "🐳 Checking Docker status..."
if ! docker info &> /dev/null; then
    echo "   ❌ Docker is not running"
    echo "   Please start Docker Desktop or run: sudo systemctl start docker"
    echo "   Then run this script again"
    exit 1
else
    echo "   ✅ Docker is running"
fi

# Step 4: Start local services (Cosmos DB Emulator + Redis)
echo ""
echo "🚀 Starting local services..."
echo ""

# Start Redis
if ! docker ps | grep -q "castiel-redis"; then
    echo "Starting Redis..."
    docker run -d \
        --name castiel-redis \
        -p 6379:6379 \
        redis:7-alpine
    echo "   ✅ Redis started on port 6379"
else
    echo "   ✅ Redis already running"
fi

# Start Cosmos DB Emulator (Linux version)
if ! docker ps | grep -q "castiel-cosmos"; then
    echo ""
    echo "Starting Cosmos DB Emulator..."
    docker run -d \
        --name castiel-cosmos \
        -p 8081:8081 \
        -p 10250-10255:10250-10255 \
        -e AZURE_COSMOS_EMULATOR_PARTITION_COUNT=10 \
        -e AZURE_COSMOS_EMULATOR_ENABLE_DATA_PERSISTENCE=false \
        mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest
    
    echo "   ✅ Cosmos DB Emulator started on port 8081"
    echo "   ⚠️  Note: It may take 30-60 seconds to fully initialize"
else
    echo "   ✅ Cosmos DB Emulator already running"
fi

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Wait for Cosmos DB Emulator to initialize (30-60 seconds)"
echo ""
echo "2. Initialize the database:"
echo "   pnpm run init:db"
echo ""
echo "3. Restart your dev servers:"
echo "   Kill current servers (Ctrl+C)"
echo "   pnpm dev"
echo ""
echo "4. Your services will be available at:"
echo "   - API: http://localhost:3001"
echo "   - Web: http://localhost:3000"
echo "   - Cosmos DB Emulator: https://localhost:8081"
echo "   - Redis: localhost:6379"
echo ""
echo "=========================================="
echo "To switch back to Azure:"
echo "=========================================="
echo ""
echo "   cp apps/api/.env.azure apps/api/.env"
echo "   Restart dev servers"
echo ""
