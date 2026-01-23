#!/usr/bin/env bash

################################################################################
# Castiel Application Stop Script
# Gracefully stops all services
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

LOG_DIR="/tmp/castiel"

# Service ports
MAIN_API_PORT=3001
FRONTEND_PORT=3000

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

stop_service() {
    local name=$1
    local port=$2
    local pid_file="$LOG_DIR/$3.pid"
    
    log_info "Stopping $name..."
    
    # Try to kill by PID file first
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
            rm -f "$pid_file"
            log_success "$name stopped (PID: $pid)"
        else
            rm -f "$pid_file"
            log_warning "$name was not running (stale PID file removed)"
        fi
    fi
    
    # Also kill any process on the port (cleanup)
    if lsof -ti:$port >/dev/null 2>&1; then
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        log_success "Cleaned up processes on port $port"
    fi
}

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║           Castiel Application Stop Script                 ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    stop_service "Frontend" $FRONTEND_PORT "frontend"
    stop_service "Main API" $MAIN_API_PORT "main-api"
    
    # Clean up any remaining tsx or next processes
    log_info "Cleaning up remaining processes..."
    pkill -f "tsx.*castiel" 2>/dev/null || true
    pkill -f "next.*castiel" 2>/dev/null || true
    
    echo ""
    log_success "All services stopped!"
    echo ""
}

main "$@"
