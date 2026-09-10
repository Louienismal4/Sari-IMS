# Sari-IMS: Installation Guide

This guide details the single-experience installation workflow for Sari-IMS, provisioning a production-ready, multi-container inventory management system.

---

## 1. Prerequisites & System Requirements

Before running the installation, ensure your host environment meets the minimum requirements:

* **Operating System**: Linux (Ubuntu 22.04+, Debian 12+, RHEL 9+), macOS (Docker Desktop / Colima), or Windows with WSL2.
* **Hardware**:
  * Minimum: 2 CPU Cores, 2 GB RAM, 10 GB Disk Space.
  * Recommended: 4 CPU Cores, 4 GB RAM, 25 GB SSD Storage.
* **Dependencies**:
  * [Docker Engine](https://docs.docker.com/engine/install/) (v24.0 or higher)
  * [Docker Compose](https://docs.docker.com/compose/install/) (v2.20 or higher)
  * OpenSSL (for automatic cryptographically secure key generation)

---

## 2. Fast-Track Production Installation

Sari-IMS provides an automated, idempotent installation script that configures your runtime environment, pulls official release images, starts all containers, executes migrations, and validates health checks.

```bash
# 1. Clone repository or download release bundle
git clone https://github.com/louienismal4/sari-ims.git
cd sari-ims/deploy

# 2. Run the single-step installer
./install.sh
```

### What the installer handles automatically:
1. Verifies Docker Engine and Compose presence.
2. Creates `deploy/.env` from template if not present.
3. Generates a unique 256-bit `APP_KEY` for Laravel encryption.
4. Generates a cryptographically strong PostgreSQL password.
5. Creates isolated runtime storage (`backups/`, `data/`).
6. Pulls immutable versioned images from GitHub Container Registry (`ghcr.io`).
7. Starts PostgreSQL 17, Redis 7, Laravel API, Next.js Frontend, and Reverse Proxy.
8. Waits for database and cache health checks to report healthy.
9. Runs initial database schema migrations (`php artisan migrate --force`).
10. Prints the accessible web URL to start onboarding.

---

## 3. First-Run Web Onboarding Flow

Once containers are online, navigate to your server domain or IP:

```text
http://<your-server-ip>/setup
```

The system automatically detects that installation is pending (`installations.status = 'pending'`) and displays the **First-Run Onboarding Wizard**:

1. **Administrator Account**:
   * Create the root manager profile (`name`, `email`, `password`).
2. **Store Configuration**:
   * Set Store Name, Owner Name, Address, Timezone, Currency (e.g. `PHP` / `₱`), and Target Margin Markup.
3. **External Integrations**:
   * Enter your Google Gemini API Key. Click **Test Key** to verify connectivity with Gemini API. The key is AES-256-CBC encrypted before saving.
4. **Finalize Setup**:
   * The backend executes an atomic transaction creating the administrator, store profile, encrypted credentials, starter catalog items, and marks `installations.status = 'completed'`.
   * Once completed, `/setup` is **permanently locked** against modification or replay attacks.

---

## 4. Local Development Launcher

For local development with hot-reloading:

```bash
# In the root repository directory:
./start.sh
```

This launches the stack locally:
* Frontend: `http://localhost:3001`
* Backend API: `http://localhost:8000`
* PostgreSQL 17: `localhost:5432`
* Redis 7: `localhost:6379`

---

## 5. Troubleshooting & FAQ

### Port Conflicts
If port `80` or `443` is already in use by Apache, Nginx, or another web server on the host:
* Edit `deploy/.env` and update `PORT=8080`.
* Restart via `./update.sh`.

### Resetting to Fresh State
To completely purge test databases and re-trigger onboarding:
```bash
cd deploy
./uninstall.sh --purge-data
./install.sh
```
