#!/usr/bin/env bash

# ==============================================================================
# 🏪 Sari-Sari Store IMS - Centralized Production Deployment & Operations CLI
# ==============================================================================
# Usage:
#   ./prod.sh                   # Install / Start production stack, migrate & verify
#   ./prod.sh update            # Safe upgrade: automated backup, pull, migrate, verify
#   ./prod.sh backup            # Create atomic compressed PostgreSQL backup
#   ./prod.sh restore <file>    # Restore database from backup archive
#   ./prod.sh stop              # Stop production containers
#   ./prod.sh restart           # Restart production containers
#   ./prod.sh logs [svc]        # Follow live container logs
#   ./prod.sh status            # View container health and status
#   ./prod.sh artisan <cmd>     # Run artisan command on production backend
#   ./prod.sh migrate           # Run pending database migrations
#   ./prod.sh uninstall [flags] # Teardown (--purge-data or --purge-all)
# ==============================================================================

set -e

# ANSI Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Quick help display without requiring Docker
show_help() {
  echo -e "${CYAN}🏪 Sari-Sari Store IMS - Production Operations CLI${NC}"
  echo ""
  echo "Usage: ./prod.sh [command]"
  echo ""
  echo "Commands:"
  echo "  (default) / start Start or install production stack and run migrations"
  echo "  update            Zero-downtime upgrade with automated pre-backup"
  echo "  backup            Create compressed PostgreSQL backup in backups/"
  echo "  restore <file>    Restore database from a .sql.gz backup"
  echo "  stop | down       Stop all production containers"
  echo "  restart           Restart all production containers"
  echo "  logs [service]    Follow live container logs (e.g. ./prod.sh logs caddy)"
  echo "  status | ps       Check health status of production containers"
  echo "  migrate           Run pending database schema migrations"
  echo "  artisan <cmd>     Run Laravel artisan commands on production backend"
  echo "  uninstall [opts]  Tear down stack (--purge-data, --purge-all, -y)"
  echo ""
}

if [[ "$1" == "help" || "$1" == "-h" || "$1" == "--help" ]]; then
  show_help
  exit 0
fi

# Detect deploy directory (runs either from root or from within deploy/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/Caddyfile" ] && [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
  DEPLOY_DIR="$SCRIPT_DIR"
elif [ -d "$SCRIPT_DIR/deploy" ]; then
  DEPLOY_DIR="$SCRIPT_DIR/deploy"
else
  DEPLOY_DIR="$SCRIPT_DIR"
fi

cd "$DEPLOY_DIR"

DOCKER_CMD="docker"

# Check Docker and permissions
ensure_docker() {
  if ! docker info >/dev/null 2>&1; then
    if sudo docker info >/dev/null 2>&1; then
      DOCKER_CMD="sudo docker"
    else
      echo -e "${YELLOW}⚠️  Docker is not installed or not running.${NC}"
      if command -v apt-get >/dev/null 2>&1 || command -v yum >/dev/null 2>&1; then
        echo -e "${BLUE}📦 Installing Docker using official script...${NC}"
        curl -fsSL https://get.docker.com | sudo sh
        sudo usermod -aG docker "$USER" 2>/dev/null || true
        DOCKER_CMD="sudo docker"
        echo -e "${GREEN}✓ Docker installed successfully.${NC}"
      else
        echo -e "${RED}❌ Please install and start Docker, then rerun ./prod.sh.${NC}"
        exit 1
      fi
    fi
  fi
}

# Detect server IP
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
LAN_IP=${LAN_IP:-localhost}

# Ensure .env exists with secure credentials
setup_env() {
  if [ ! -f ".env" ]; then
    echo -e "${BLUE}⚙️  Generating production .env configuration...${NC}"
    if [ -f ".env.example" ]; then
      cp .env.example .env
    else
      touch .env
    fi

    # Generate random database passwords and app key
    DB_PASS=$(openssl rand -hex 16 2>/dev/null || tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)
    RAW_KEY=$(openssl rand -base64 32 2>/dev/null || tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32 | base64)
    LARAVEL_KEY="base64:${RAW_KEY}"

    if grep -q "^DB_PASSWORD=" .env; then
      sed -i.bak "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASS}|g" .env
    else
      echo "DB_PASSWORD=${DB_PASS}" >> .env
    fi

    if grep -q "^APP_KEY=" .env; then
      sed -i.bak "s|^APP_KEY=.*|APP_KEY=${LARAVEL_KEY}|g" .env
    else
      echo "APP_KEY=${LARAVEL_KEY}" >> .env
    fi
    rm -f .env.bak 2>/dev/null || true

    echo -e "${GREEN}✓ Generated secure production secrets in .env${NC}"
  fi

  # Source .env for variables
  set -a
  # shellcheck disable=SC1091
  . .env
  set +a
}

# Display live status and service links
show_status() {
  local domain="${DOMAIN:-:80}"
  local url="http://${LAN_IP}"

  if [ "$domain" != ":80" ] && [ "$domain" != "localhost" ] && [ -n "$domain" ]; then
    url="https://${domain}"
  fi

  echo ""
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "${GREEN} 🚀 SARI-IMS PRODUCTION IS LIVE!${NC}"
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "  ${BOLD}App URL / POS:${NC}     ${CYAN}${url}${NC}"
  echo -e "  ${BOLD}Setup Wizard:${NC}      ${CYAN}${url}/setup${NC}"
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "  • Check logs:      ${BLUE}./prod.sh logs${NC}"
  echo -e "  • Check status:    ${BLUE}./prod.sh status${NC}"
  echo -e "  • Create backup:   ${BLUE}./prod.sh backup${NC}"
  echo -e "  • Update system:   ${BLUE}./prod.sh update${NC}"
  echo -e "  • Stop system:     ${BLUE}./prod.sh stop${NC}"
  echo -e "${GREEN}=====================================================${NC}"
  echo ""
}

# Helper: Wait for PostgreSQL container health
wait_for_db() {
  echo -ne "${CYAN}⏳ Waiting for PostgreSQL container to become ready...${NC}"
  for i in {1..35}; do
    if $DOCKER_CMD compose exec -T postgres pg_isready -U "${DB_USERNAME:-sari_prod_user}" -d "${DB_DATABASE:-sari_inventory}" >/dev/null 2>&1; then
      echo -e " ${GREEN}✓ Database ready!${NC}"
      return 0
    fi
    echo -ne "."
    sleep 2
  done
  echo -e "\n${YELLOW}⚠️  PostgreSQL health check timed out. Continuing...${NC}"
}

# Helper: Perform database backup
do_backup() {
  ensure_docker
  setup_env
  local backup_dir="${DEPLOY_DIR}/backups"
  mkdir -p "${backup_dir}"

  local timestamp
  timestamp=$(date +"%Y%m%d_%H%M%S")
  local backup_file="${backup_dir}/sari_backup_${timestamp}.sql.gz"

  echo -e "${BLUE}💾 Creating atomic PostgreSQL backup...${NC}"
  $DOCKER_CMD compose exec -T -e PGPASSWORD="${DB_PASSWORD}" postgres \
    pg_dump -U "${DB_USERNAME:-sari_prod_user}" -d "${DB_DATABASE:-sari_inventory}" -F p \
    | gzip > "${backup_file}"

  if [ -s "${backup_file}" ]; then
    local size
    size=$(du -h "${backup_file}" | cut -f1)
    echo -e "${GREEN}✓ Backup created successfully!${NC}"
    echo -e "  File: ${CYAN}${backup_file}${NC} (${size})"
  else
    echo -e "${RED}❌ Backup file is empty. Please verify database container status.${NC}"
    rm -f "${backup_file}"
    return 1
  fi
}

# Command dispatch
case "$1" in
  start|up|install|"")
    ensure_docker
    setup_env
    echo -e "${BLUE}⬇️  Pulling latest production images from registry...${NC}"
    $DOCKER_CMD compose pull
    echo -e "${BLUE}🚀 Launching production containers...${NC}"
    $DOCKER_CMD compose up -d
    wait_for_db
    echo -e "${BLUE}📦 Running database migrations...${NC}"
    $DOCKER_CMD compose exec -T backend php artisan migrate --force
    show_status
    ;;

  update|upgrade)
    ensure_docker
    echo -e "${BLUE}=====================================================${NC}"
    echo -e "${BLUE} 🔄 Upgrading Sari-IMS Production Stack${NC}"
    echo -e "${BLUE}=====================================================${NC}"
    echo -e "${CYAN}Step 1: Creating automated pre-update safety backup...${NC}"
    do_backup || { echo -e "${YELLOW}⚠️ Backup failed, continuing upgrade...${NC}"; }

    echo -e "${CYAN}Step 2: Pulling latest container images...${NC}"
    $DOCKER_CMD compose pull

    echo -e "${CYAN}Step 3: Recreating containers gracefully...${NC}"
    $DOCKER_CMD compose up -d --remove-orphans

    wait_for_db

    echo -e "${CYAN}Step 4: Executing database migrations...${NC}"
    $DOCKER_CMD compose exec -T backend php artisan migrate --force

    echo -e "${CYAN}Step 5: Verifying health endpoint...${NC}"
    if $DOCKER_CMD compose exec -T backend php -r "
      try {
        \$h = json_decode(@file_get_contents('http://127.0.0.1:8000/api/health'), true);
        if (\$h && (\$h['status'] === 'ok' || \$h['status'] === 'degraded')) {
          echo 'OK' . PHP_EOL;
          exit(0);
        }
        exit(1);
      } catch (Exception \$e) {
        exit(1);
      }
    " >/dev/null 2>&1; then
      echo -e "${GREEN}✓ Health check OK.${NC}"
    else
      echo -e "${YELLOW}⚠️  Notice: Health check not yet responding OK. Check logs: ./prod.sh logs${NC}"
    fi

    show_status
    ;;

  backup)
    do_backup
    ;;

  restore)
    backup_file="$2"
    if [ -z "$backup_file" ]; then
      echo -e "${RED}❌ Please specify the backup file to restore.${NC}"
      echo "Usage: ./prod.sh restore <path_to_sari_backup_*.sql.gz>"
      exit 1
    fi
    if [ ! -f "$backup_file" ]; then
      echo -e "${RED}❌ Backup file not found: $backup_file${NC}"
      exit 1
    fi
    ensure_docker
    setup_env
    echo -e "${YELLOW}⚠️  Restoring database from: $backup_file${NC}"
    echo -e "${YELLOW}This will overwrite existing database records.${NC}"
    read -rp "Proceed? (y/N): " confirm
    case "$confirm" in
      [yY][eE][sS]|[yY])
        echo -e "${BLUE}Restoring database...${NC}"
        gunzip -c "$backup_file" | $DOCKER_CMD compose exec -T -e PGPASSWORD="${DB_PASSWORD}" postgres \
          psql -U "${DB_USERNAME:-sari_prod_user}" -d "${DB_DATABASE:-sari_inventory}"
        echo -e "${GREEN}✓ Database restored successfully.${NC}"
        ;;
      *)
        echo "Restore cancelled."
        exit 0
        ;;
    esac
    ;;

  stop|down)
    ensure_docker
    $DOCKER_CMD compose down
    echo -e "${GREEN}✓ Production containers stopped.${NC}"
    ;;

  restart)
    ensure_docker
    setup_env
    $DOCKER_CMD compose restart
    show_status
    ;;

  logs)
    ensure_docker
    shift
    $DOCKER_CMD compose logs -f "$@"
    ;;

  status|ps)
    ensure_docker
    $DOCKER_CMD compose ps
    ;;

  migrate)
    ensure_docker
    $DOCKER_CMD compose exec -T backend php artisan migrate --force
    echo -e "${GREEN}✓ Migrations complete.${NC}"
    ;;

  artisan)
    ensure_docker
    shift
    $DOCKER_CMD compose exec -T backend php artisan "$@"
    ;;

  uninstall)
    ensure_docker
    shift || true
    purge_volumes=false
    purge_env=false
    force=false

    for arg in "$@"; do
      case "$arg" in
        --purge-data) purge_volumes=true ;;
        --purge-all)  purge_volumes=true; purge_env=true ;;
        -y|--yes|--force) force=true ;;
      esac
    done

    if [ "$force" = false ]; then
      echo -e "${YELLOW}⚠️  This will stop and tear down production containers.${NC}"
      if [ "$purge_volumes" = true ]; then
        echo -e "${RED}⚠️  WARNING: Persistent volumes will be PERMANENTLY DELETED.${NC}"
      fi
      read -rp "Proceed? (y/N): " confirm
      case "$confirm" in
        [yY][eE][sS]|[yY]) ;;
        *) echo "Aborted."; exit 0 ;;
      esac
    fi

    if [ "$purge_volumes" = true ]; then
      $DOCKER_CMD compose down -v --remove-orphans
      echo -e "${GREEN}✓ Containers and volumes removed.${NC}"
    else
      $DOCKER_CMD compose down --remove-orphans
      echo -e "${GREEN}✓ Containers stopped and removed (volumes preserved).${NC}"
    fi

    if [ "$purge_env" = true ]; then
      rm -f .env .env.bak
      echo -e "${GREEN}✓ Configuration .env removed.${NC}"
    fi
    ;;

  *)
    echo -e "${RED}Unknown command: $1${NC}"
    echo -e "Run ${BOLD}./prod.sh --help${NC} for available options."
    exit 1
    ;;
esac
