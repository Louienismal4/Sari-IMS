#!/usr/bin/env bash

# ==============================================================================
# 🏪 Sari-Sari Store IMS - Centralized Local Development Launcher
# ==============================================================================
# Usage:
#   ./dev.sh              # Start everything, initialize DB, seed, open browser
#   ./dev.sh stop         # Stop all containers
#   ./dev.sh restart      # Restart containers
#   ./dev.sh logs         # Follow live logs (e.g. ./dev.sh logs frontend)
#   ./dev.sh status       # Check container health & status
#   ./dev.sh seed         # Seed/re-seed initial catalog items
#   ./dev.sh reset        # Fresh database migration and seed (migrate:fresh --seed)
#   ./dev.sh artisan ...  # Run Laravel artisan commands in backend
#   ./dev.sh shell [svc]  # Open shell in container (default: backend)
#   ./dev.sh open         # Open the app in your default browser
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
MAGENTA='\033[0;35m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Helper: Open URL in default browser across OSes
open_browser() {
  local target_url="$1"
  echo -e "${CYAN}🌐 Opening browser to:${NC} ${BOLD}${target_url}${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$target_url" 2>/dev/null || true
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "$target_url" 2>/dev/null || sensible-browser "$target_url" 2>/dev/null || true
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    cmd.exe /c start "$target_url" 2>/dev/null || true
  else
    echo -e "Please open ${target_url} in your browser."
  fi
}

# Helper: Ensure Docker daemon is running
ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not installed.${NC}"
    echo -e "Please install Docker Desktop to run Sari-IMS:"
    echo -e "👉 https://www.docker.com/products/docker-desktop/"
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker daemon is not running.${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      echo -e "${BLUE}🚀 Attempting to start Docker Desktop...${NC}"
      open -a Docker 2>/dev/null || open -a "Docker Desktop" 2>/dev/null || colima start 2>/dev/null || orbstart 2>/dev/null || true
      echo -ne "${CYAN}⏳ Waiting for Docker to wake up${NC}"
      for i in {1..30}; do
        if docker info >/dev/null 2>&1; then
          echo -e " ${GREEN}✓ Docker is ready!${NC}"
          return 0
        fi
        echo -ne "."
        sleep 2
      done
      echo ""
      echo -e "${RED}❌ Docker Desktop took too long to start.${NC}"
      echo -e "Please start Docker Desktop manually, then run ${BOLD}./dev.sh${NC} again."
      exit 1
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      echo -e "${BLUE}🚀 Attempting to start Docker service...${NC}"
      sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null || true
      sleep 3
      if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Could not connect to Docker daemon.${NC}"
        echo -e "Please run: ${BOLD}sudo systemctl start docker${NC} and rerun ${BOLD}./dev.sh${NC}."
        exit 1
      fi
    else
      echo -e "${RED}❌ Please launch Docker Desktop and rerun ./dev.sh.${NC}"
      exit 1
    fi
  fi
}

# Helper: Initialize .env and generate APP_KEY if missing
ensure_env() {
  if [ ! -f "$ENV_FILE" ]; then
    echo -e "${BLUE}⚙️  Setting up configuration from $ENV_EXAMPLE...${NC}"
    if [ -f "$ENV_EXAMPLE" ]; then
      cp "$ENV_EXAMPLE" "$ENV_FILE"
    else
      touch "$ENV_FILE"
    fi
  fi

  # Generate random APP_KEY if empty or default
  current_key=$(grep -E "^APP_KEY=" "$ENV_FILE" 2>/dev/null | cut -d '=' -f2- | tr -d ' "' || true)
  if [ -z "$current_key" ]; then
    echo -e "${BLUE}🔑 Generating application encryption key...${NC}"
    raw_key=$(openssl rand -base64 32 2>/dev/null || php -r "echo base64_encode(random_bytes(32));" 2>/dev/null || head -c 32 /dev/urandom | base64)
    new_app_key="base64:${raw_key}"
    if grep -q "^APP_KEY=" "$ENV_FILE"; then
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^APP_KEY=.*|APP_KEY=${new_app_key}|" "$ENV_FILE"
      else
        sed -i "s|^APP_KEY=.*|APP_KEY=${new_app_key}|" "$ENV_FILE"
      fi
    else
      echo "APP_KEY=${new_app_key}" >> "$ENV_FILE"
    fi
    echo -e "${GREEN}✓ Application key generated.${NC}"
  fi

  # Ensure DB_CONNECTION is set to pgsql
  if ! grep -q "^DB_CONNECTION=" "$ENV_FILE"; then
    echo "DB_CONNECTION=pgsql" >> "$ENV_FILE"
  fi

  # Clean any stale config/package cache on host that may interfere with mounting
  rm -f backend/bootstrap/cache/*.php 2>/dev/null || true
}

# Helper: Get configured ports
get_ports() {
  fe_port=$(grep -E "^FRONTEND_PORT=" "$ENV_FILE" 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || echo "3001")
  fe_port=${fe_port:-3001}
  be_port=$(grep -E "^BACKEND_PORT=" "$ENV_FILE" 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || echo "8000")
  be_port=${be_port:-8000}
  db_port=$(grep -E "^DB_PORT=" "$ENV_FILE" 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || echo "5432")
  db_port=${db_port:-5432}
  db_user=$(grep -E "^DB_USERNAME=" "$ENV_FILE" 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || echo "sari_user")
  db_name=$(grep -E "^DB_DATABASE=" "$ENV_FILE" 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || echo "sari_inventory")
}

# Helper: Wait for PostgreSQL, Redis, backend, and frontend
wait_for_services() {
  get_ports

  echo -ne "${CYAN}⏳ Waiting for PostgreSQL to initialize${NC}"
  for i in {1..35}; do
    if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${db_user}" -d "${db_name}" >/dev/null 2>&1; then
      echo -e " ${GREEN}✓ Ready!${NC}"
      break
    fi
    echo -ne "."
    sleep 1
    if [ "$i" -eq 35 ]; then
      echo -e "\n${YELLOW}⚠️  PostgreSQL took longer than expected. Continuing startup...${NC}"
    fi
  done

  echo -ne "${CYAN}⏳ Waiting for Redis to initialize${NC}"
  for i in {1..20}; do
    if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping >/dev/null 2>&1; then
      echo -e " ${GREEN}✓ Ready!${NC}"
      break
    fi
    echo -ne "."
    sleep 1
  done

  echo -e "${BLUE}📦 Running database migrations...${NC}"
  docker compose -f "$COMPOSE_FILE" exec -T backend php artisan migrate --force || true

  echo -ne "${CYAN}⏳ Waiting for Next.js frontend on port ${fe_port}${NC}"
  for i in {1..40}; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${fe_port}" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ] || [ "$http_code" = "304" ] || [ "$http_code" = "307" ] || [ "$http_code" = "308" ]; then
      echo -e " ${GREEN}✓ Ready!${NC}"
      break
    fi
    echo -ne "."
    sleep 1
  done
}

# Helper: Display final banner and open browser
show_success_and_open() {
  get_ports
  local app_url="http://localhost:${fe_port}"

  echo ""
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "${GREEN} 🏪 SARI-SARI STORE IMS IS READY (DEV)!${NC}"
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "  ${BOLD}App Dashboard / POS:${NC} ${CYAN}${app_url}${NC}"
  echo -e "  ${BOLD}Setup Wizard:${NC}        ${CYAN}${app_url}/setup${NC}"
  echo -e "  ${BOLD}Backend API:${NC}          ${CYAN}http://localhost:${be_port}${NC}"
  echo -e "  ${BOLD}PostgreSQL 17:${NC}        ${CYAN}localhost:${db_port}${NC}"
  echo -e "  ${BOLD}Redis 7 Cache:${NC}        ${CYAN}localhost:6379${NC}"
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "  • Stop system:   ${BLUE}./dev.sh stop${NC}"
  echo -e "  • View logs:     ${BLUE}./dev.sh logs${NC}"
  echo -e "  • Restart:       ${BLUE}./dev.sh restart${NC}"
  echo -e "  • Check status:  ${BLUE}./dev.sh status${NC}"
  echo -e "  • Open browser:  ${BLUE}./dev.sh open${NC}"
  echo -e "  • Reset DB:      ${BLUE}./dev.sh reset${NC}"
  echo -e "${GREEN}=====================================================${NC}"
  echo ""

  # Automatically load the page in default web browser
  open_browser "$app_url"
}

# Command dispatch
case "$1" in
  start|up|"")
    echo -e "${GREEN}=====================================================${NC}"
    echo -e "${GREEN} 🏪 Initializing Sari-Sari Store IMS (Dev)...${NC}"
    echo -e "${GREEN}=====================================================${NC}"
    ensure_docker
    ensure_env
    echo -e "${BLUE}🔨 Building & launching Docker containers...${NC}"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
    wait_for_services
    show_success_and_open
    ;;

  stop|down)
    echo -e "${YELLOW}🛑 Stopping Sari-IMS dev containers...${NC}"
    docker compose -f "$COMPOSE_FILE" down
    echo -e "${GREEN}✓ All containers stopped.${NC}"
    ;;

  restart)
    ensure_docker
    ensure_env
    echo -e "${BLUE}🔄 Restarting Sari-IMS dev stack...${NC}"
    docker compose -f "$COMPOSE_FILE" down
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
    wait_for_services
    show_success_and_open
    ;;

  logs)
    shift
    docker compose -f "$COMPOSE_FILE" logs -f "$@"
    ;;

  status|ps)
    docker compose -f "$COMPOSE_FILE" ps
    ;;

  seed)
    echo -e "${BLUE}🌱 Seeding database catalog items...${NC}"
    docker compose -f "$COMPOSE_FILE" exec -T backend php artisan db:seed --force
    echo -e "${GREEN}✓ Database seeded successfully.${NC}"
    ;;

  reset)
    echo -e "${YELLOW}⚠️  Resetting database and running fresh migrations...${NC}"
    docker compose -f "$COMPOSE_FILE" exec -T backend php artisan migrate:fresh --seed --force
    echo -e "${GREEN}✓ Database reset and starter items seeded.${NC}"
    ;;

  migrate)
    echo -e "${BLUE}📦 Running database migrations...${NC}"
    docker compose -f "$COMPOSE_FILE" exec -T backend php artisan migrate --force
    echo -e "${GREEN}✓ Migrations complete.${NC}"
    ;;

  artisan)
    shift
    docker compose -f "$COMPOSE_FILE" exec backend php artisan "$@"
    ;;

  shell)
    service="${2:-backend}"
    echo -e "${BLUE}🐚 Entering shell in $service container...${NC}"
    docker compose -f "$COMPOSE_FILE" exec "$service" sh
    ;;

  open)
    ensure_env
    get_ports
    open_browser "http://localhost:${fe_port}"
    ;;

  help|-h|--help)
    echo -e "${CYAN}🏪 Sari-Sari Store IMS - Development Launcher${NC}"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  (default)         Initialize stack, build containers, migrate, seed, open browser"
    echo "  stop | down       Stop all running dev containers"
    echo "  restart           Restart stack with rebuild and reload application"
    echo "  logs [service]    Follow real-time container logs"
    echo "  status | ps       Check status of all dev containers"
    echo "  seed              Re-seed catalog starter items"
    echo "  reset             Fresh database migration and seed (migrate:fresh --seed)"
    echo "  migrate           Run pending database migrations"
    echo "  open              Open app in default web browser"
    echo "  artisan [cmd]     Run Laravel artisan commands in backend"
    echo "  shell [service]   Open interactive shell (backend, frontend, postgres, redis)"
    echo ""
    ;;

  *)
    echo -e "${RED}Unknown command: $1${NC}"
    echo -e "Run ${BOLD}./dev.sh --help${NC} for available options."
    exit 1
    ;;
esac
