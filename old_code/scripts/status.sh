#!/usr/bin/env bash

################################################################################
# Castiel Application Status Script
# Shows current status of all services
################################################################################

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

is_port_in_use() {
    lsof -ti:$1 >/dev/null 2>&1
}

check_health() {
    local port=$1
    local endpoint=$2
    curl -s -f --max-time 2 "http://localhost:$port$endpoint" >/dev/null 2>&1
}

show_service_status() {
    local name=$1
    local port=$2
    local health_endpoint=$3
    local pid_file="$LOG_DIR/$4.pid"
    
    if is_port_in_use $port; then
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            echo -e "  ${GREEN}✓${NC} $name"
            echo -e "    Port: $port"
            echo -e "    PID:  $pid"
            
            if [ -n "$health_endpoint" ]; then
                if check_health $port "$health_endpoint"; then
                    echo -e "    Health: ${GREEN}OK${NC}"
                else
                    echo -e "    Health: ${YELLOW}Degraded${NC}"
                fi
            fi
        else
            echo -e "  ${YELLOW}⚠${NC} $name (running but no PID file)"
            echo -e "    Port: $port"
        fi
    else
        echo -e "  ${RED}✗${NC} $name"
        echo -e "    Status: Not running"
    fi
    echo ""
}

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                  Castiel Services Status                  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    show_service_status "Main API" $MAIN_API_PORT "/health" "main-api"
    show_service_status "Frontend" $FRONTEND_PORT "" "frontend"
    
    echo -e "${BLUE}URLs:${NC}"
    echo -e "  • Frontend:    ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
    echo -e "  • Main API:    http://localhost:$MAIN_API_PORT"
    echo ""
    
    echo -e "${BLUE}Logs:${NC}"
    if [ -f "$LOG_DIR/main-api.log" ]; then
        echo -e "  • Main API:    tail -f $LOG_DIR/main-api.log"
    fi
    if [ -f "$LOG_DIR/frontend.log" ]; then
        echo -e "  • Frontend:    tail -f $LOG_DIR/frontend.log"
    fi
    echo ""
    
    echo -e "${BLUE}Commands:${NC}"
    echo -e "  • Start:  ./scripts/start-dev.sh"
    echo -e "  • Stop:   ./scripts/stop-dev.sh"
    echo -e "  • Status: ./scripts/status.sh"
    echo ""
}

main "$@"
