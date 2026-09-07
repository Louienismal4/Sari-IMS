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

## ⚡ Quick Start (One-Click Setup & Launch)

To run the entire system locally with zero configuration:

1. **Clone or download the repository / package**
2. **Run the startup script:**
   - **macOS / Linux:**
     ```bash
     ./start.sh
     ```
   - **Windows:** Double-click `start.bat` (or run `.\start.bat` in PowerShell/CMD)

The script automatically:
- Checks Docker and starts the daemon if needed
- Generates `.env` and application encryption keys
- Builds and starts all containers (MySQL, Laravel API, Next.js Frontend)
- Runs database migrations
- Pre-populates starter store inventory items (noodles, coffee, canned goods, snacks)
- **Automatically launches your browser to `http://localhost:3001`**, loaded and ready to use!

---

## 🛠️ Service Endpoints & Management

### Endpoints
| Service | URL | Notes |
| :--- | :--- | :--- |
| **Frontend POS & App** | [http://localhost:3001](http://localhost:3001) | Next.js with Fast Refresh (auto-opened) |
| **Backend API** | [http://localhost:8000](http://localhost:8000) | Laravel API server |
| **MySQL Database** | `localhost:3306` | Accessible via TablePlus / DBeaver (`lwui` / `Water123!`) |

### CLI Management (`./start.sh` or `./dev.sh`)
| Command | Description | Example |
| :--- | :--- | :--- |
| `./start.sh` | One-click start, initialize, seed & open browser | `./start.sh` |
| `./start.sh stop` | Stop all containers | `./start.sh stop` |
| `./start.sh restart` | Restart all containers | `./start.sh restart` |
| `./start.sh logs [service]` | View live container logs | `./start.sh logs frontend` |
| `./start.sh status` | View container health & status | `./start.sh status` |
| `./start.sh seed` | Re-seed starter catalog items | `./start.sh seed` |
| `./start.sh reset` | Fresh database migration and re-seed | `./start.sh reset` |
| `./start.sh open` | Re-open the app in default browser | `./start.sh open` |
| `./start.sh artisan <cmd>` | Execute Laravel artisan command | `./start.sh artisan route:list` |
| `./start.sh shell [service]` | Open interactive shell in container | `./start.sh shell backend` |

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
