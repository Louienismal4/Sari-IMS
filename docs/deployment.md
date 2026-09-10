# Sari-IMS: Deployment Architecture

This document describes the container topology, orchestration rules, and reverse proxy architecture for production deployment.

---

## 1. System Architecture Diagram

```text
                           CLIENT BROWSER / POS
                                    │
                                    ▼
                         PORT 80 / 443 (HTTPS)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            [ Caddy / Nginx ]              [ Caddy / Nginx ]
             (:80 HTTP Redir)               (:443 TLS Proxy)
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
  /api/*, /health         /* (UI Routes)
        │                       │
        ▼                       ▼
 [ Laravel Backend ]     [ Next.js Frontend ]
      (:8000)                 (:3000)
        │
   ┌────┴────────────────────────┐
   ▼                             ▼
[ PostgreSQL 17 ]          [ Redis 7 ]
  (Persistent Data)        (Cache & Locks)
```

---

## 2. Container Services

| Service | Container Name | Image Source | Purpose |
| :--- | :--- | :--- | :--- |
| `postgres` | `sari_postgres_prod` | `postgres:17-alpine` | Primary transactional relational storage |
| `redis` | `sari_redis_prod` | `redis:7-alpine` | Atomic installation locks, cache, rate limits |
| `backend` | `sari_backend_prod` | `ghcr.io/.../backend:<tag>` | Laravel 11/12 REST API & AI processing |
| `frontend` | `sari_frontend_prod`| `ghcr.io/.../frontend:<tag>`| Next.js App Router standalone build |
| `caddy` / `nginx` | `sari_caddy_prod` | `caddy:alpine` / `nginx` | TLS termination, reverse proxy, security headers |

---

## 3. Storage & Persistence Guarantees

Container recreation, rebuilds, and image upgrades **never delete application data**. Data persistence is guaranteed by named Docker volumes:

* `pg_data_prod`: Stores PostgreSQL database files (`/var/lib/postgresql/data`).
* `redis_data_prod`: Stores Redis memory dumps and persistent cache snapshots (`/data`).
* `caddy_data_prod` & `caddy_config_prod`: Stores TLS certificates and ACME account keys.
* `deploy/backups/`: Host directory containing compressed `.sql.gz` backups.

---

## 4. Operational Commands

All commands are executed from the `deploy/` directory:

```bash
# Check container status and health
docker compose ps

# Follow real-time production logs
docker compose logs -f

# View specific service logs (e.g. backend)
docker compose logs -f backend

# Restart services
docker compose restart

# Graceful shutdown (preserves all data)
docker compose down

# Safe image upgrade with automated backup
./update.sh

# Create atomic database backup
./backup.sh

# Complete uninstallation
./uninstall.sh
```
