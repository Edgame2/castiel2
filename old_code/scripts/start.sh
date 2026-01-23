#!/usr/bin/env bash

# Lightweight startup helper for local experimentation

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="/tmp/castiel"

mkdir -p "$LOG_DIR"

echo "Starting Main API on port 3001..."
cd "$PROJECT_ROOT/services/main-api" && pnpm dev > "$LOG_DIR/main-api.start.log" 2>&1 &
API_PID=$!
echo "Main API PID: $API_PID"

sleep 5

echo "Starting Frontend on port 3000..."
cd "$PROJECT_ROOT/services/frontend" && pnpm dev > "$LOG_DIR/frontend.start.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

sleep 5

echo ""
echo "Services started!"
echo "  Main API : http://localhost:3001 (PID: $API_PID)"
echo "  Frontend : http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "Logs:"
echo "  tail -f $LOG_DIR/main-api.start.log"
echo "  tail -f $LOG_DIR/frontend.start.log"
echo ""
echo "Stop services:"
echo "  kill $API_PID $FRONTEND_PID"
