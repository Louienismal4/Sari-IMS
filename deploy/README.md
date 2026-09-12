# 🚀 Sari-IMS Production Deployment & Operations Guide

This guide covers bootstrapping, updating, backing up, and maintaining Sari-IMS in production environments using Docker Compose, PostgreSQL 17, Redis 7, and Caddy.

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    Public Traffic                       │
│               Port 80 (HTTP) / 443 (HTTPS)              │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
                   Caddy Reverse Proxy
             (Automatic TLS & Domain Routing)
              ┌─────────────┴─────────────┐
              ▼                           ▼
      Next.js Frontend             Laravel 12 API
      (Port 3000 Internal)       (Port 8000 Internal)
              │                           │
              └─────────────┬─────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        PostgreSQL 17                  Redis 7
      (Persistent Data)          (Session, Queue, Lock)
```

- **Immutable Images**: Docker images contain only compiled application code and static assets. No secrets, credentials, or customer data are baked into images.
- **Externalized Runtime Configuration**: Infrastructure variables (`DB_*`, `REDIS_*`, `APP_KEY`) are provided via `.env`.
- **Database-Backed Application Config**: Store profile, currency, and settings are stored in PostgreSQL (`stores` and `settings` tables).
- **Encrypted Application Credentials**: Third-party API keys (e.g. Google Gemini AI) are encrypted at rest using AES-256-CBC in `integration_credentials`.
- **Setup Locking**: Once installation is completed, all `/setup` endpoints are locked (`403 Forbidden`).

---

## ⚡ 1. Clean Installation

### Option A: One-Command Download on Server (Recommended)
On your production server (Linux VPS, mini-PC, or Raspberry Pi):

```bash
# 1. Download the release bundle
curl -fsSLO https://github.com/Louienismal4/Sari-IMS/releases/latest/download/sari-ims-deploy.tar.gz

# 2. Extract the archive
tar -xzf sari-ims-deploy.tar.gz

# 3. Launch and initialize the stack
./prod.sh
```

### Option B: Copy from Local Development Machine
```bash
scp -r deploy user@your-server:/opt/sari-ims
cd /opt/sari-ims
./prod.sh
```

The `./prod.sh` script automatically:
- Verifies Docker & Docker Compose.
- Provisions `.env` from `.env.example`.
- Generates a unique 32-byte `APP_KEY` and secure random `DB_PASSWORD`.
- Pulls the latest release images from GitHub Container Registry (GHCR).
- Boots PostgreSQL 17, Redis 7, Laravel Backend, Next.js Frontend, and Caddy.
- Runs initial database migrations.

### 4. Complete Setup Wizard
Open your browser to:
```text
http://<your-server-ip-or-domain>/setup
```
Complete the 5-step Setup Wizard to create your Administrator account, configure your store details, and optionally test your Google Gemini AI key.

---

## 🔄 2. Upgrading / Updating

To upgrade an existing installation to a new version without losing any data or customer configuration:

```bash
cd /opt/sari-ims
./prod.sh update
```

The update script automatically:
1. Creates a timestamped PostgreSQL backup into `backups/`.
2. Pulls the latest container images.
3. Recreates containers gracefully (`docker compose up -d`).
4. Executes any new database schema migrations (`php artisan migrate --force`).
5. Verifies application health via `/api/health`.

---

## 💾 3. Backups & Restoration

### Creating a Backup
To trigger an on-demand, atomic backup of the PostgreSQL database:
```bash
./prod.sh backup
```
Backups are saved as compressed SQL archives in `deploy/backups/sari_backup_YYYYMMDD_HHMMSS.sql.gz`.

### Restoring a Backup
To restore a backup into the running PostgreSQL container:
```bash
./prod.sh restore backups/sari_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## 🩺 4. Health Checks & Diagnostics

Query the health check endpoint:
```bash
curl -i http://localhost/api/health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2026-09-09T23:30:00Z",
  "checks": {
    "database": true,
    "redis": true,
    "storage_writable": true,
    "installed": true
  }
}
```

---

## 🔒 5. Security Principles

1. **Never commit `.env`**: Always keep actual server secrets in `.env` (ignored by Git).
2. **Setup Route Locking**: After installation, any attempts to access mutating setup routes will receive `403 Installation already completed`.
3. **Log Redaction**: Passwords, API tokens, and authorization headers are automatically redacted from Laravel exception logs.
