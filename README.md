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
2. **Run the development launcher script:**
   - **macOS / Linux:**
     ```bash
     ./dev.sh
     ```
   - **Windows:** Double-click `start.bat` (or run `.\start.bat` in PowerShell/CMD)

The script automatically:
- Checks Docker and starts the daemon if needed
- Generates `.env` and application encryption keys
- Builds and starts all containers (PostgreSQL 17, Redis 7, Laravel API, Next.js Frontend)
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
| **PostgreSQL Database** | `localhost:5432` | Accessible via TablePlus / DBeaver (`sari_user` / `.env` password) |
| **Redis Cache & Queue** | `localhost:6379` | Cache, sessions, and queue driver |

### CLI Management (`./dev.sh`)
| Command | Description | Example |
| :--- | :--- | :--- |
| `./dev.sh` | One-click start, initialize, seed & open browser | `./dev.sh` |
| `./dev.sh stop` | Stop all containers | `./dev.sh stop` |
| `./dev.sh restart` | Restart all containers | `./dev.sh restart` |
| `./dev.sh logs [service]` | View live container logs | `./dev.sh logs frontend` |
| `./dev.sh status` | View container health & status | `./dev.sh status` |
| `./dev.sh seed` | Re-seed starter catalog items | `./dev.sh seed` |
| `./dev.sh reset` | Fresh database migration and re-seed | `./dev.sh reset` |
| `./dev.sh open` | Re-open the app in default browser | `./dev.sh open` |
| `./dev.sh artisan <cmd>` | Execute Laravel artisan command | `./dev.sh artisan route:list` |
| `./dev.sh shell [service]` | Open interactive shell in container | `./dev.sh shell backend` |

---

## 🚀 Production Deployment & Management (`./prod.sh`)

### 1. Automated CI/CD & Release Pipeline
Whenever you push to the `main` branch (or tag a release `v*.*.*`), GitHub Actions will automatically:
1. Build and push production backend & frontend images to GitHub Container Registry (`ghcr.io`).
2. Package all production configs and CLI tools into `sari-ims-deploy.tar.gz`.
3. Publish the release bundle directly to **GitHub Releases (`latest`)** and Actions artifacts.

### 2. Deploying on Your Production Server
On your production server (Linux VPS, mini-PC, or Raspberry Pi), simply run:

```bash
# 1. Download the latest deployment bundle
curl -fsSLO https://github.com/Louienismal4/Sari-IMS/releases/latest/download/sari-ims-deploy.tar.gz

# 2. Extract the archive
tar -xzf sari-ims-deploy.tar.gz

# 3. Launch and initialize the stack
./prod.sh
```

*(Alternatively, you can copy the `deploy/` directory from your machine via `scp -r deploy user@server:/opt/sari-ims` and run `./prod.sh` inside it).*

### 3. Production CLI Management
- **Upgrade with automatic pre-backup:** `./prod.sh update`
- **Backup database:** `./prod.sh backup`
- **Restore database:** `./prod.sh restore <backup_file>`
- **View live logs:** `./prod.sh logs`
- **Check service health:** `./prod.sh status`
- **Stop containers:** `./prod.sh stop`
