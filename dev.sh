#!/usr/bin/env bash

# ==============================================================================
# Sari-Sari Store - Local Development Launcher
# (Forwarder to ./start.sh)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/start.sh" "$@"
