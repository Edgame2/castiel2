#!/usr/bin/env bash
# Quick start script for testing user management features

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "======================================"
echo "Starting Castiel Services for Testing"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Redis
echo -e "${YELLOW}Checking Redis...${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Redis is not running${NC}"
    echo "  Please start Redis: redis-server"
    exit 1
fi
echo ""

# Check if services are already running
echo -e "${YELLOW}Checking for running services...${NC}"
if lsof -i :3001 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Main API already running on port 3001${NC}"
    read -p "Kill existing process and restart? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti :3001 | xargs kill -9
        echo -e "${GREEN}✓ Killed existing main-api${NC}"
    fi
fi

if lsof -i :3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Frontend already running on port 3000${NC}"
    read -p "Kill existing process and restart? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti :3000 | xargs kill -9
        echo -e "${GREEN}✓ Killed existing frontend${NC}"
    fi
fi
echo ""

# Start Main API
echo -e "${YELLOW}Starting Main API (port 3001)...${NC}"
cd "$PROJECT_ROOT/services/main-api"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ No .env file found in main-api${NC}"
    echo "  Please copy .env.example to .env and configure it"
    exit 1
fi

pnpm dev > /tmp/main-api.log 2>&1 &
MAIN_API_PID=$!
echo -e "${GREEN}✓ Main API starting (PID: $MAIN_API_PID)${NC}"
echo "  Logs: tail -f /tmp/main-api.log"
echo ""

echo -e "${YELLOW}Waiting for Main API to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Main API is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Main API failed to start${NC}"
        echo "  Check logs: tail -f /tmp/main-api.log"
        kill $MAIN_API_PID 2>/dev/null || true
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""

# Start Frontend
echo -e "${YELLOW}Starting Frontend (port 3000)...${NC}"
cd "$PROJECT_ROOT/services/frontend"

if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠ No .env.local file found${NC}"
    echo "  Creating default .env.local..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_APP_ENV=development
EOF
    echo -e "${GREEN}✓ Created .env.local${NC}"
fi

pnpm dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend starting (PID: $FRONTEND_PID)${NC}"
echo "  Logs: tail -f /tmp/frontend.log"
echo ""

echo -e "${YELLOW}Waiting for Frontend to be ready...${NC}"
for i in {1..60}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is ready!${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}✗ Frontend failed to start${NC}"
        echo "  Check logs: tail -f /tmp/frontend.log"
        kill $FRONTEND_PID 2>/dev/null || true
        kill $MAIN_API_PID 2>/dev/null || true
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""

echo -e "${GREEN}======================================"
echo "All services are running!"
echo "======================================${NC}"
echo ""
echo "Services:"
echo "  • Frontend: http://localhost:3000"
echo "  • Main API: http://localhost:3001"
echo ""
echo "Logs:"
echo "  • Main API: tail -f /tmp/main-api.log"
echo "  • Frontend: tail -f /tmp/frontend.log"
echo ""
echo "Process IDs:"
echo "  • Main API: $MAIN_API_PID"
echo "  • Frontend: $FRONTEND_PID"
echo ""
echo "To stop services:"
echo "  kill $MAIN_API_PID $FRONTEND_PID"
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Follow the testing guide: .github/docs/frontend/authentication/TESTING_GUIDE.md"
echo "  3. Run backend tests: pnpm --filter @castiel/main-api test"
echo ""
