#!/usr/bin/env bash
# ==============================================================================
# SARI-IMS PRODUCTION UNINSTALL SCRIPT
# Safely tears down containers, networks, and optionally purges persistent data
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${DEPLOY_DIR}"

echo "=================================================="
echo "  🗑️  Sari-IMS Uninstaller"
echo "=================================================="

PURGE_VOLUMES=false
PURGE_ENV=false
FORCE=false

for arg in "$@"; do
    case "$arg" in
        --purge-data)
            PURGE_VOLUMES=true
            ;;
        --purge-all)
            PURGE_VOLUMES=true
            PURGE_ENV=true
            ;;
        -y|--yes|--force)
            FORCE=true
            ;;
        -h|--help)
            echo "Usage: ./uninstall.sh [options]"
            echo ""
            echo "Options:"
            echo "  --purge-data    Remove persistent Docker database and cache volumes"
            echo "  --purge-all     Remove volumes and runtime .env configuration"
            echo "  -y, --yes       Bypass interactive confirmation prompt"
            echo "  -h, --help      Display this help message"
            exit 0
            ;;
    esac
done

if [ "$FORCE" = false ]; then
    echo "This will stop and remove all Sari-IMS containers."
    if [ "$PURGE_VOLUMES" = true ]; then
        echo "⚠️  WARNING: --purge-data specified. All database records and cache will be PERMANENTLY ERASED."
    fi
    read -rp "Are you sure you want to proceed? (y/N): " confirm
    case "$confirm" in
        [yY][eE][sS]|[yY])
            echo "Proceeding with teardown..."
            ;;
        *)
            echo "Aborted."
            exit 0
            ;;
    esac
fi

echo "Stopping and removing containers..."
if [ "$PURGE_VOLUMES" = true ]; then
    docker compose down -v --remove-orphans
    echo "✓ Containers, networks, and volumes removed."
else
    docker compose down --remove-orphans
    echo "✓ Containers and networks removed. Persistent volumes preserved."
fi

if [ "$PURGE_ENV" = true ]; then
    rm -f .env .env.bak
    echo "✓ Runtime configuration (.env) removed."
fi

echo ""
echo "=================================================="
echo "  ✓ Sari-IMS has been successfully uninstalled."
echo "=================================================="
