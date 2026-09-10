#!/usr/bin/env bash
# ==============================================================================
# SARI-IMS PRODUCTION UPDATE SCRIPT
# Phase 25: Safe image upgrade with automated pre-update backup & migration
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${DEPLOY_DIR}"

echo "=================================================="
echo "  🔄 Sari-IMS Production Upgrade"
echo "=================================================="

# 1. Trigger pre-update safety backup
echo "Step 1: Creating safety backup before upgrading..."
"${SCRIPT_DIR}/backup.sh"

# 2. Pull new container images
echo "Step 2: Pulling latest container images..."
docker compose pull

# 3. Restart services with new images
echo "Step 3: Updating and restarting containers..."
docker compose up -d --remove-orphans

# 4. Wait for database readiness
echo "Step 4: Verifying service health..."
sleep 5

# 5. Run database migrations
echo "Step 5: Applying database schema migrations..."
docker compose exec -T backend php artisan migrate --force

# 6. Verify health check
echo "Step 6: Querying health endpoint..."
if docker compose exec -T backend php -r "
    try {
        \$h = json_decode(file_get_contents('http://127.0.0.1:8000/api/health'), true);
        if (\$h && (\$h['status'] === 'ok' || \$h['status'] === 'degraded')) {
            echo 'Health check OK!' . PHP_EOL;
            exit(0);
        }
        exit(1);
    } catch (Exception \$e) {
        exit(1);
    }
"; then
    echo "✓ Application health verified."
else
    echo "⚠️ Warning: Health check did not return OK immediately. Please verify logs."
fi

echo ""
echo "=================================================="
echo "  ✅ Sari-IMS Upgrade Complete!"
echo "=================================================="
