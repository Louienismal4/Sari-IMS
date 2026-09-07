#!/usr/bin/env bash

# ==============================================================================
# Sari-Sari Store - Production Deployment Management Script
# ==============================================================================

set -e

# Automatically find the deploy directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/deploy" ]; then
  DEPLOY_DIR="$SCRIPT_DIR/deploy"
else
  DEPLOY_DIR="$SCRIPT_DIR"
fi
cd "$DEPLOY_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Check Docker and permissions
DOCKER_CMD="docker"
if ! docker info >/dev/null 2>&1; then
  if sudo docker info >/dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
  else
    echo -e "${YELLOW}⚠️  Docker is not installed or running.${NC}"
    echo -e "${BLUE}📦 Installing Docker using official installer...${NC}"
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER" 2>/dev/null || true
    DOCKER_CMD="sudo docker"
    echo -e "${GREEN}✓ Docker installed successfully.${NC}"
  fi
fi

# Detect server LAN IP
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
LAN_IP=${LAN_IP:-localhost}

# Automatically generate .env on first run
setup_env() {
  if [ ! -f ".env" ]; then
    echo -e "${BLUE}⚙️  Generating production .env...${NC}"
    DB_PASS=$(openssl rand -hex 12 2>/dev/null || tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24)
    ROOT_PASS=$(openssl rand -hex 12 2>/dev/null || tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24)
    KEY_VAL=$(openssl rand -base64 32 2>/dev/null || echo "3mYqA+k5Xq19vD8E42pZLmN0qW5yR9T7uI2oP8aK4mE=")
    LARAVEL_KEY="base64:${KEY_VAL}"

    cat << EOF > .env
DOCKER_IMAGE_OWNER=louienismal4
TAG=latest

PORT=80
DOMAIN=:80

DB_DATABASE=sari_inventory
DB_USERNAME=sari_prod_user
DB_PASSWORD=${DB_PASS}
DB_ROOT_PASSWORD=${ROOT_PASS}

APP_KEY=${LARAVEL_KEY}
APP_URL=http://${LAN_IP}
GEMINI_API_KEY=
EOF
    echo -e "${GREEN}✓ Generated secure credentials in .env${NC}"
  fi
}

show_status() {
  DOMAIN_SET=$(grep -E "^DOMAIN=" .env 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || echo ":80")
  if [ "$DOMAIN_SET" = ":80" ] || [ -z "$DOMAIN_SET" ]; then
    URL="http://${LAN_IP}"
  else
    URL="http://${DOMAIN_SET}"
  fi

  echo ""
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "${GREEN} 🚀 SARI-IMS IS LIVE!${NC}"
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "  ${BOLD}Open in Browser:${NC} ${CYAN}${URL}${NC}"
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "  • Check logs:    ${BLUE}./deploy.sh logs${NC}"
  echo -e "  • Stop app:      ${BLUE}./deploy.sh stop${NC}"
  echo -e "  • Restart app:   ${BLUE}./deploy.sh restart${NC}"
  echo -e "  • Check status:  ${BLUE}./deploy.sh status${NC}"
  echo ""
}

case "$1" in
  start|up|"")
    setup_env
    echo -e "${BLUE}⬇️  Pulling latest images...${NC}"
    $DOCKER_CMD compose pull
    echo -e "${BLUE}🚀 Starting containers...${NC}"
    $DOCKER_CMD compose up -d
    echo -e "${BLUE}⏳ Waiting for MySQL...${NC}"
    for i in {1..30}; do
      if $DOCKER_CMD compose exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
        echo -e "${GREEN}✓ MySQL is ready.${NC}"
        break
      fi
      sleep 2
    done
    echo -e "${BLUE}📦 Running database migrations...${NC}"
    $DOCKER_CMD compose exec -T backend php artisan migrate --force
    show_status
    ;;

  stop|down)
    $DOCKER_CMD compose down
    echo -e "${GREEN}✓ Stopped.${NC}"
    ;;

  restart)
    setup_env
    $DOCKER_CMD compose restart
    show_status
    ;;

  logs)
    shift
    $DOCKER_CMD compose logs -f "$@"
    ;;

  status|ps)
    $DOCKER_CMD compose ps
    ;;

  migrate)
    $DOCKER_CMD compose exec -T backend php artisan migrate --force
    ;;

  artisan)
    shift
    $DOCKER_CMD compose exec -T backend php artisan "$@"
    ;;

  *)
    echo -e "${CYAN}Sari Production Deployment Manager${NC}"
    echo ""
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start | up        Start production containers & run migrations (default)"
    echo "  stop  | down      Stop production containers"
    echo "  restart           Restart production containers"
    echo "  logs [service]    Follow real-time container logs"
    echo "  status | ps       Check container status"
    echo "  migrate           Run database migrations"
    echo "  artisan [cmd]     Run Laravel artisan commands in backend"
    echo ""
    ;;
esac