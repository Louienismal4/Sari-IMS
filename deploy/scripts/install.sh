#!/usr/bin/env bash
# ==============================================================================
# SARI-IMS PRODUCTION INSTALLATION SCRIPT
# Phase 24: Automated bootstrap, key generation, and container provisioning
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${DEPLOY_DIR}"

echo "=================================================="
echo "  🏪 Sari-IMS Production Installation"
echo "=================================================="

# 1. Verify Prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Error: Docker is required but not installed."; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "❌ Error: Docker Compose is required."; exit 1; }

echo "✓ Docker & Docker Compose detected."

# 2. Provision Runtime Environment (.env)
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
    else
        echo "❌ Error: Neither .env nor .env.example found in ${DEPLOY_DIR}."
        exit 1
    fi
fi

# 3. Generate APP_KEY if absent or placeholder
if grep -q "APP_KEY=base64:GENERATE_KEY_HERE" .env || grep -q "^APP_KEY=$" .env || ! grep -q "^APP_KEY=" .env; then
    echo "Generating secure APP_KEY..."
    RAW_KEY=$(openssl rand -base64 32)
    NEW_KEY="base64:${RAW_KEY}"
    sed -i.bak "s|^APP_KEY=.*|APP_KEY=${NEW_KEY}|g" .env
    rm -f .env.bak
    echo "✓ APP_KEY generated."
fi

# 4. Generate random database password if default
if grep -q "DB_PASSWORD=ChangeThisToAStrongPassword!" .env; then
    echo "Generating random PostgreSQL password..."
    GEN_PASS=$(openssl rand -hex 16)
    sed -i.bak "s|^DB_PASSWORD=.*|DB_PASSWORD=${GEN_PASS}|g" .env
    rm -f .env.bak
    echo "✓ Secure DB_PASSWORD generated."
fi

# 5. Create storage directories
mkdir -p backups data

# 6. Pull latest release images
echo "Pulling latest Docker images from registry..."
docker compose pull || true

# 7. Start containers
echo "Starting containers..."
docker compose up -d

# 8. Wait for PostgreSQL & Redis
echo "Waiting for services to become healthy..."
for i in {1..30}; do
    if docker compose ps | grep -q "sari_postgres_prod.*healthy" || docker compose ps | grep -q "postgres.*healthy"; then
        echo "✓ Database container is healthy."
        break
    fi
    sleep 2
done

# 9. Run initial database migrations
echo "Executing database migrations..."
docker compose exec -T backend php artisan migrate --force

echo ""
echo "=================================================="
echo "  🎉 Sari-IMS Successfully Provisioned!"
echo "=================================================="
echo "Next step: Navigate to your server in a browser:"
echo "👉 http://localhost/setup (or your configured DOMAIN)"
echo "Complete the setup wizard to initialize your store."
echo "=================================================="
