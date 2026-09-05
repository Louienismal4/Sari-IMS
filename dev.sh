#!/usr/bin/env bash

# ==============================================================================
# Sari-Sari Store - Local Development Docker Management Script
# ==============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

# ANSI Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ensure_env() {
  if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  $ENV_FILE not found. Creating from $ENV_EXAMPLE...${NC}"
    if [ -f "$ENV_EXAMPLE" ]; then
      cp "$ENV_EXAMPLE" "$ENV_FILE"
      echo -e "${GREEN}✓ Created $ENV_FILE${NC}"
    else
      touch "$ENV_FILE"
      echo -e "${GREEN}✓ Created blank $ENV_FILE${NC}"
    fi
  fi
}

show_info() {
  fe_port=$(grep -E "^FRONTEND_PORT=" "$ENV_FILE" 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || echo "3001")
  fe_port=${fe_port:-3001}
  be_port=$(grep -E "^BACKEND_PORT=" "$ENV_FILE" 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || echo "8000")
  be_port=${be_port:-8000}
  db_port=$(grep -E "^DB_PORT=" "$ENV_FILE" 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || echo "3306")
  db_port=${db_port:-3306}

  echo ""
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "${GREEN} 🛠️  SARI LOCAL DEV IS RUNNING!${NC}"
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "  ${CYAN}Frontend:${NC}    http://localhost:${fe_port}"
  echo -e "  ${CYAN}Backend API:${NC} http://localhost:${be_port}"
  echo -e "  ${CYAN}MySQL Port:${NC}  localhost:${db_port}"
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "  • Check logs:   ${BLUE}./dev.sh logs${NC}"
  echo -e "  • Stop stack:   ${BLUE}./dev.sh stop${NC}"
  echo -e "  • Check status: ${BLUE}./dev.sh status${NC}"
  echo ""
}

case "$1" in
  start|up|"")
    ensure_env
    echo -e "${BLUE}🔨 Starting local development stack with .env...${NC}"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
    show_info
    ;;

  stop|down)
    echo -e "${YELLOW}🛑 Stopping development containers...${NC}"
    docker compose -f "$COMPOSE_FILE" down
    echo -e "${GREEN}✓ Dev containers stopped.${NC}"
    ;;

  restart)
    ensure_env
    echo -e "${BLUE}🔄 Restarting development stack...${NC}"
    docker compose -f "$COMPOSE_FILE" down
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
    show_info
    ;;

  logs)
    shift
    docker compose -f "$COMPOSE_FILE" logs -f "$@"
    ;;

  status|ps)
    docker compose -f "$COMPOSE_FILE" ps
    ;;

  migrate)
    echo -e "${BLUE}📦 Running database migrations in dev backend...${NC}"
    docker compose -f "$COMPOSE_FILE" exec backend php artisan migrate
    ;;

  artisan)
    shift
    docker compose -f "$COMPOSE_FILE" exec backend php artisan "$@"
    ;;

  shell)
    service="${2:-backend}"
    echo -e "${BLUE}🐚 Entering shell in $service...${NC}"
    docker compose -f "$COMPOSE_FILE" exec "$service" sh
    ;;

  *)
    echo -e "${CYAN}Sari Development Manager${NC}"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start | up        Start development containers in background (default)"
    echo "  stop  | down      Stop development containers"
    echo "  restart           Restart development stack"
    echo "  logs [service]    Follow real-time container logs"
    echo "  status | ps       Check container status"
    echo "  migrate           Run database migrations"
    echo "  artisan [cmd]     Run Laravel artisan commands"
    echo "  shell [service]   Open shell in service (default: backend)"
    echo ""
    ;;
esac
