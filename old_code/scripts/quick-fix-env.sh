#!/bin/bash

echo "========================================"
echo "Quick Fix: Update .env for Local Dev"
echo "========================================"
echo ""

# Backup current .env
if [ -f "apps/api/.env" ]; then
    echo "📋 Backing up current .env..."
    cp apps/api/.env apps/api/.env.azure-backup
    echo "   ✅ Saved to .env.azure-backup"
else
    echo "❌ No .env file found!"
    exit 1
fi

echo ""
echo "📝 Updating Cosmos DB and Redis settings..."

# Update to use local Cosmos DB Emulator
sed -i 's|^COSMOS_DB_ENDPOINT=.*|COSMOS_DB_ENDPOINT=https://localhost:8081/|' apps/api/.env
sed -i 's|^COSMOS_DB_KEY=.*|COSMOS_DB_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==|' apps/api/.env
sed -i 's|^COSMOS_DB_DATABASE=.*|COSMOS_DB_DATABASE=castiel-dev|' apps/api/.env

# Update to use local Redis
sed -i 's|^REDIS_HOST=.*|REDIS_HOST=localhost|' apps/api/.env
sed -i 's|^REDIS_PORT=.*|REDIS_PORT=6379|' apps/api/.env
sed -i 's|^REDIS_PASSWORD=.*|REDIS_PASSWORD=|' apps/api/.env
sed -i 's|^REDIS_TLS=.*|REDIS_TLS=false|' apps/api/.env

echo "   ✅ Configuration updated"

echo ""
echo "========================================"
echo " Configuration Updated!"
echo "========================================"
echo ""
echo "Next Steps:"
echo ""
echo "1. Start Docker (if not running):"
echo "   sudo systemctl start docker"
echo "   OR open Docker Desktop"
echo ""
echo "2. Start local services:"
echo "   ./switch-to-local-dev.sh"
echo "   OR manually run Docker containers"
echo ""
echo "3. Restart dev servers:"
echo "   Ctrl+C to stop current servers"
echo "   pnpm dev"
echo ""
echo "========================================"
echo "To revert to Azure:"
echo "   cp apps/api/.env.azure-backup apps/api/.env"
echo "========================================"
