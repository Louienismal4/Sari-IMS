# 🏪 Sari-Sari Store Inventory Management System (Sari-IMS)

A modern full-stack Point of Sale (POS) and Inventory Management System designed for neighborhood retail convenience stores.

---

## 🏗️ Architecture & Project Structure

```text
Sari-IMS/
├── .github/workflows/        # 🚀 GitHub Actions CI/CD (Build & Push Docker Images to GHCR)
│   └── docker-publish.yml
│
├── backend/                  # 🐘 Laravel 12 API (PHP 8.4)
│   ├── app/                  # Controllers, Models, Services
│   ├── database/             # Migrations, Seeders
│   ├── routes/api.php        # REST Endpoints
│   └── Dockerfile            # Production-ready PHP 8.4 container with OPcache
│
├── frontend/                 # ⚡ Next.js 15 App Router (TypeScript, Tailwind, shadcn/ui)
│   ├── src/                  # Components, Pages, State management
│   └── Dockerfile            # Multi-stage production container with standalone output
│
├── deploy/                   # 🌐 Production Server Deployment
│   ├── docker-compose.yml    # Production runner (pulls GHCR images + Caddy + MySQL)
│   ├── .env.example          # Production environment template
│   └── Caddyfile             # Reverse proxy (Port 80/443, SSL, domain routing)
│
├── .env.example              # 🛠️ Local environment template
├── .env                      # 🛠️ Local environment secrets & ports (git-ignored)
├── docker-compose.yml        # 🛠️ Local dev stack (with hot reload volumes)
├── dev.sh                    # 🛠️ Local development CLI helper
└── README.md
```

---

## 🛠️ Local Development

In local development, the source code in `backend/` and `frontend/` is live-mounted into Docker containers for instant hot reloading.

### 1. Start the Dev Stack
```bash
./dev.sh start
# or: docker compose up -d
```

### 2. Dev Endpoints
| Service | URL | Notes |
| :--- | :--- | :--- |
| **Frontend** | [http://localhost:3001](http://localhost:3001) | Next.js with Fast Refresh |
| **Backend API** | [http://localhost:8000](http://localhost:8000) | Laravel API server |
| **MySQL** | `localhost:3306` | Accessible via TablePlus / DBeaver (`lwui` / `Water123!`) |

### 3. Local CLI Helper (`./dev.sh`)
| Command | Description | Example |
| :--- | :--- | :--- |
| `./dev.sh start` | Launch development containers in background | `./dev.sh start` |
| `./dev.sh stop` | Stop development containers | `./dev.sh stop` |
| `./dev.sh restart` | Restart development containers | `./dev.sh restart` |
| `./dev.sh logs` | View live container logs | `./dev.sh logs frontend` |
| `./dev.sh status` | View container health & status | `./dev.sh status` |
| `./dev.sh migrate` | Run database migrations in backend container | `./dev.sh migrate` |
| `./dev.sh artisan <cmd>` | Execute Laravel artisan command | `./dev.sh artisan route:list` |
| `./dev.sh shell [service]` | Open a shell in a dev container | `./dev.sh shell backend` |

---

## 🚀 Automated CI/CD & Production Deployment

### 1. Automated Build on Push to `main`
Whenever you push or merge changes into the `main` branch (or tag a release `v*.*.*`), GitHub Actions will automatically:
1. Build the production backend Docker image and push to `ghcr.io/<owner>/sari-ims/backend:latest`.
2. Build the optimized Next.js standalone image and push to `ghcr.io/<owner>/sari-ims/frontend:latest`.

### 2. Deploying on Your Production Server
On your production server (or local mini-PC / VPS):

1. Copy the `deploy/` directory to the server.
2. Copy `deploy/.env.example` to `deploy/.env` and configure your domain & secrets:
   ```bash
   cp deploy/.env.example deploy/.env
   nano deploy/.env
   ```
3. Pull the latest release images and launch the stack:
   ```bash
   cd deploy
   docker compose pull
   docker compose up -d
   ```
4. Run migrations on the production backend:
   ```bash
   docker compose exec backend php artisan migrate --force
   ```
