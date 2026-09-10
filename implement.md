Absolutely. The 46 sections can be consolidated into a much more practical implementation plan organized around **architecture → development → deployment → security → testing**.

# IMS Docker Deployment & First-Run Onboarding

## 1. Objective

Refactor the IMS deployment so it can be distributed as a **single installation experience** while internally using multiple Docker containers.

### Stack

- Next.js — frontend
- Laravel — backend/API
- PostgreSQL — database
- Redis — cache/queue
- Nginx — reverse proxy
- Docker / Docker Compose — deployment
- GitHub Actions — CI/CD
- GHCR — container registry

### Primary goals

- No customer credentials inside Docker images.
- Same images can be used by every installation.
- Runtime infrastructure configuration is external to images.
- Application configuration is stored in PostgreSQL.
- Sensitive application credentials are encrypted at rest.
- Persistent data survives container recreation and upgrades.
- Fresh installations automatically enter an onboarding flow.
- Completed installations bypass onboarding.
- Users install the entire system through one installation process.
- Releases can be versioned, upgraded, backed up, and rolled back.

---

# 2. Target Architecture

```text
                         GITHUB
                            │
                            ▼
                    GitHub Actions
                            │
               ┌────────────┴────────────┐
               │                         │
             TEST                       BUILD
               │                         │
               └────────────┬────────────┘
                            ▼
                         GHCR
               ┌────────────┴────────────┐
               │                         │
               ▼                         ▼
       ims-frontend:<version>    ims-backend:<version>
               │                         │
               └────────────┬────────────┘
                            │
                            ▼
                       install.sh
                            │
                            ▼
                     Docker Compose
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
      Nginx               Next.js             Laravel
                                                │
                                      ┌─────────┴─────────┐
                                      ▼                   ▼
                                  PostgreSQL            Redis
                                      │
                                      ▼
                              Persistent Volumes
```

### Important distinction

```text
One installation
       ≠
One container
```

The IMS should remain a multi-container application.

The user experience should be one installation.

---

# 3. Configuration Architecture

Configuration must be separated into three categories.

## 3.1 Runtime / Infrastructure Configuration

These are values required for the application to start:

```env
APP_ENV=production
APP_DEBUG=false
APP_KEY=

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=ims
DB_USERNAME=ims
DB_PASSWORD=

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
```

These belong to the deployment/runtime environment.

---

## 3.2 Application Configuration

These belong to the IMS installation:

```text
Store name
Store address
Timezone
Currency
Inventory settings
Notification settings
Business configuration
Feature settings
```

Store these in PostgreSQL.

---

## 3.3 Application Secrets

Examples:

```text
Third-party API keys
API secrets
Access tokens
Webhook secrets
SMTP credentials
Payment credentials
```

Store these encrypted in PostgreSQL.

Do not place customer secrets in:

- Dockerfiles
- Git
- Docker images
- frontend bundles
- logs

---

# 4. Repository and Deployment Structure

Target structure:

```text
ims/
│
├── frontend/
│   ├── app/
│   │   ├── setup/
│   │   ├── login/
│   │   └── ...
│   ├── components/
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   └── Setup/
│   │   │   └── Middleware/
│   │   ├── Models/
│   │   └── Services/
│   │       ├── Installation/
│   │       └── Credentials/
│   │
│   ├── database/
│   │   └── migrations/
│   └── ...
│
├── docker/
│   ├── frontend/
│   │   └── Dockerfile
│   ├── backend/
│   │   └── Dockerfile
│   └── nginx/
│
├── deploy/
│   ├── compose.yaml
│   ├── .env.example
│   ├── install.sh
│   ├── update.sh
│   ├── backup.sh
│   └── uninstall.sh
│
├── docs/
│   ├── installation.md
│   ├── deployment.md
│   ├── configuration.md
│   ├── upgrading.md
│   └── backup-restore.md
│
└── README.md
```

---

# 5. Phase 1 — Docker Image Refactor

## Goal

Make application images portable and credential-free.

### Backend image

Contains:

```text
PHP
Composer dependencies
Laravel
Application code
```

### Frontend image

Contains:

```text
Node runtime
Next.js application
Compiled assets
```

### Must not contain

```text
Customer .env
Customer API credentials
Customer passwords
Customer-specific configuration
```

Remove patterns such as:

```dockerfile
COPY .env /app/.env
```

and customer-specific:

```dockerfile
ARG SECRET=...
ENV SECRET=...
```

### Acceptance criteria

A single image can be deployed to multiple customers without rebuilding it for each customer.

---

# 6. Phase 2 — Runtime Configuration

Create:

```text
deploy/.env.example
```

Do not commit the real runtime `.env`.

Production configuration must be supplied at runtime.

Example deployment structure:

```text
/opt/ims/
├── compose.yaml
├── .env
├── data/
└── backups/
```

The actual location can vary, but the runtime configuration must not be part of the application image.

### Important

The web onboarding should **not** be responsible for modifying the Docker image.

The deployment system owns infrastructure configuration.

---

# 7. Phase 3 — Docker Compose

Create the production Compose configuration.

Services:

```text
nginx
frontend
backend
postgres
redis
```

Example:

```yaml
services:
  nginx:
    image: ...

  frontend:
    image: ...

  backend:
    image: ...
    env_file:
      - ./.env

  postgres:
    image: postgres:<pinned-version>
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:<pinned-version>
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Requirements

- Pin production image versions.
- Use persistent volumes.
- Define service dependencies.
- Add health checks where appropriate.
- Keep infrastructure configuration separate from application code.

---

# 8. Phase 4 — Persistent Data

At minimum, persist:

```text
PostgreSQL data
Application storage
Redis data where required
Runtime configuration
```

Example:

```text
postgres_data
storage_data
redis_data
```

Container recreation must not destroy application data.

Test with:

```bash
docker compose down
docker compose up -d
```

and verify that all application data remains.

---

# 9. Phase 5 — Installation Bootstrap

Create:

```text
deploy/install.sh
```

The script provides the **single installation experience**.

### Responsibilities

```text
1. Check Docker
2. Check Docker Compose
3. Create deployment directories
4. Generate runtime configuration
5. Generate installation-specific secrets
6. Pull required images
7. Start PostgreSQL and Redis
8. Wait for services to become ready
9. Start Laravel/Next.js/Nginx
10. Run migrations
11. Run health checks
12. Display the setup URL
```

User experience:

```bash
./install.sh
```

Then:

```text
IMS installed.

Open:
http://<server-address>
```

---

# 10. Phase 6 — Installation State

Create an installation state model.

Table:

```text
installations
────────────────────────
id
status
version
installed_at
created_at
updated_at
```

Initial:

```text
pending
```

After successful setup:

```text
completed
```

Optional:

```text
installing
failed
```

The installation state must be persisted in PostgreSQL.

---

# 11. Phase 7 — Installation Detection

Create:

```http
GET /api/installation/status
```

Fresh installation:

```json
{
  "installed": false
}
```

Completed installation:

```json
{
  "installed": true
}
```

The response must not expose:

- Environment variables
- Database credentials
- API secrets
- Encryption keys
- Internal infrastructure information

---

# 12. Phase 8 — Installation Middleware

Create a Laravel installation middleware.

Logic:

```text
Installation pending
        │
        ├── allow setup endpoints
        └── block/redirect normal application routes

Installation completed
        │
        ├── allow normal application routes
        └── reject setup endpoints
```

The backend must enforce installation state.

Do not rely only on Next.js routing.

---

# 13. Phase 9 — Onboarding UI

Create:

```text
/setup
```

The frontend checks installation status.

### Wizard

```text
Welcome
   ↓
Administrator
   ↓
Store
   ↓
Integrations
   ↓
Verification
   ↓
Complete
```

The user should not need to manually edit Docker files.

---

# 14. Phase 10 — Administrator Setup

Collect:

```text
Name
Email
Password
```

Create the initial administrator.

Requirements:

- Secure password hashing.
- Input validation.
- Strong password requirements.
- Duplicate email protection.
- Correct administrative permissions.

---

# 15. Phase 11 — Store and Application Configuration

Create application tables/models for:

```text
stores
settings
```

Example store data:

```text
Store name
Address
Timezone
Currency
Contact information
```

Example application settings:

```text
Inventory defaults
Notification settings
Feature settings
Business rules
```

Do not store these in `.env`.

The database is the source of truth for application configuration.

---

# 16. Phase 12 — Integration Credentials

Create:

```text
integration_credentials
```

Suggested fields:

```text
id
provider
key
encrypted_value
created_at
updated_at
```

Example:

```text
provider: shopify
key: api_secret
encrypted_value: <ciphertext>
```

Credentials must be encrypted before persistence.

The frontend must never receive decrypted credentials unnecessarily.

---

# 17. Phase 13 — Credential Service

Create a centralized service:

```text
CredentialService
```

Responsibilities:

```text
store()
get()
update()
delete()
exists()
```

Application code should use the service instead of directly manipulating encrypted values throughout the codebase.

Example conceptual usage:

```php
$secret = $credentialService->get(
    'shopify',
    'api_secret'
);
```

The decryption occurs only server-side.

---

# 18. Phase 14 — Integration Testing

Allow users to test credentials before finalizing configuration.

Flow:

```text
User enters credentials
        ↓
Backend validates input
        ↓
Backend tests external API
        ↓
       success
          │
          ▼
    Encrypt + store
```

Failure:

```text
Invalid credentials
        ↓
Safe error returned
        ↓
User can retry
```

Errors must not expose credentials, authorization headers, passwords, or connection strings.

---

# 19. Phase 15 — Final Installation

Before completing installation, verify:

```text
✓ Database
✓ Redis
✓ Storage
✓ Migrations
✓ Administrator
✓ Store configuration
✓ Required settings
✓ Integrations
✓ Encryption/decryption
```

Only then:

```text
installations.status = completed
```

The frontend redirects to:

```text
/login
```

---

# 20. Phase 16 — Secure Installation Lock

Once installation is completed:

```text
/setup
```

must no longer be usable.

Backend setup endpoints must reject requests.

Example:

```http
403 Installation already completed
```

Also protect against:

- Direct API calls
- Replay attempts
- Concurrent setup sessions
- Duplicate administrator creation

Use a transaction/lock for the final installation process.

---

# 21. Phase 17 — Laravel Runtime Configuration

Define the configuration hierarchy:

```text
Runtime environment
        ↓
Infrastructure configuration

PostgreSQL
        ↓
Application configuration

Encrypted PostgreSQL values
        ↓
Application secrets
```

Do not make `.env` the database for the entire application.

Account for Laravel configuration caching during startup, setup, and updates.

---

# 22. Phase 18 — Next.js Security

Audit all environment variables.

Anything under:

```text
NEXT_PUBLIC_*
```

must be assumed to be browser-visible.

Never expose:

```text
Database credentials
Private API secrets
Private tokens
Passwords
Encryption keys
```

Private external integrations should flow through Laravel:

```text
Browser
   ↓
Next.js
   ↓
Laravel
   ↓
External API
```

---

# 23. Phase 19 — GHCR CI/CD

Keep the current deployment pipeline:

```text
GitHub
   ↓
GitHub Actions
   ↓
Docker Build
   ↓
GHCR
```

### Pull request CI

```text
Lint
Tests
Frontend build
Backend build
Docker build validation
```

### Release pipeline

```text
Tests
   ↓
Build images
   ↓
Security checks
   ↓
Push to GHCR
   ↓
Create release
```

Build and publish:

```text
ghcr.io/<owner>/ims-frontend:<version>
ghcr.io/<owner>/ims-backend:<version>
```

---

# 24. Phase 20 — Versioning and Releases

Use explicit version tags.

Example:

```text
ims-frontend:1.0.0
ims-backend:1.0.0
```

Optionally also publish:

```text
ims-frontend:sha-<commit>
ims-backend:sha-<commit>
```

Production deployments should reference a specific version rather than relying exclusively on:

```text
latest
```

This makes upgrades and rollback deterministic.

---

# 25. Phase 21 — Production Update

Create:

```text
deploy/update.sh
```

Update flow:

```text
Backup
   ↓
Pull new images
   ↓
Recreate application containers
   ↓
Run migrations
   ↓
Refresh Laravel configuration/cache
   ↓
Run health checks
   ↓
Verify installation
```

Do not delete persistent volumes during an update.

Customer configuration and data must remain intact.

---

# 26. Phase 22 — Rollback

Maintain the ability to return to the previous application version.

Example:

```text
1.0.0
  ↓
1.1.0
  ↓
problem
  ↓
1.0.0
```

Application images should be versioned so rollback does not require rebuilding.

Database rollback must be handled separately because not all migrations are safely reversible.

---

# 27. Phase 23 — Backup and Restore

Create:

```text
deploy/backup.sh
```

Back up:

```text
PostgreSQL
Runtime configuration
APP_KEY
Persistent application files
```

Store backups separately from the running containers where possible.

Define:

```text
Backup
Restore
Verification
```

and test actual restoration.

---

# 28. Phase 24 — Health and Operations

Add:

```http
GET /health
GET /health/ready
```

Readiness should verify appropriate dependencies:

```text
Laravel
PostgreSQL
Redis
Storage
```

Do not expose secrets through health endpoints.

Document operational commands:

```bash
docker compose ps
docker compose logs
docker compose restart
docker compose pull
```

---

# 29. Phase 25 — Security Review

Perform a dedicated security audit covering:

```text
Environment variable exposure
Docker image secrets
Git secret leakage
Frontend bundle leakage
Setup endpoint bypass
Credential storage
Credential retrieval
Credential logging
Authentication
Authorization
Rate limiting
CSRF
Container permissions
Database permissions
Volume permissions
```

Test the application as an unauthenticated user and attempt to bypass onboarding directly through the API.

---

# 30. Phase 26 — Testing

## Fresh installation

```text
./install.sh
```

Verify:

```text
✓ Containers start
✓ PostgreSQL works
✓ Redis works
✓ Laravel works
✓ Next.js works
✓ Nginx works
✓ /setup appears
✓ Admin setup works
✓ Store setup works
✓ Integration setup works
✓ Installation completes
✓ Login works
✓ Dashboard works
```

## Container recreation

```bash
docker compose down
docker compose up -d
```

Verify:

```text
✓ Data remains
✓ Installation remains completed
✓ Credentials remain
✓ Application starts
```

## Upgrade

```text
1.0.0 → 1.1.0
```

Verify:

```text
✓ Data remains
✓ Configuration remains
✓ APP_KEY remains
✓ Encrypted secrets remain readable
✓ Migrations work
✓ Application works
```

## Failure recovery

Test:

```text
Database failure
Redis failure
Invalid API credentials
Migration failure
Storage failure
Interrupted installation
Interrupted update
```

Verify that failures are recoverable and do not leak sensitive information.

---

# 31. Phase 27 — Documentation

Create:

```text
docs/installation.md
docs/deployment.md
docs/configuration.md
docs/upgrading.md
docs/backup-restore.md
```

Document:

```text
Requirements
Installation
Architecture
Configuration
Onboarding
Updates
Rollback
Backup
Restore
Troubleshooting
```

Never include actual credentials.

---

# 32. Final User Experience

The entire product should feel like a single application installation:

```text
User obtains IMS
        ↓
./install.sh
        ↓
Docker pulls images from GHCR
        ↓
All containers start
        ↓
User opens browser
        ↓
/setup
        ↓
Create Administrator
        ↓
Configure Store
        ↓
Configure Integrations
        ↓
Verify Installation
        ↓
Installation Complete
        ↓
/login
        ↓
/dashboard
```

The user does not need to manually:

```text
Pull frontend image
Pull backend image
Create PostgreSQL container
Create Redis container
Edit Dockerfiles
Add secrets to images
Modify Laravel source
```

---

# 33. Final Deployment Architecture

```text
                            GITHUB
                               │
                               ▼
                       GitHub Actions
                               │
                    ┌──────────┴──────────┐
                    │                     │
                   TEST                  BUILD
                    │                     │
                    └──────────┬──────────┘
                               ▼
                              GHCR
                    ┌──────────┴──────────┐
                    ▼                     ▼
          ims-frontend:1.0.0     ims-backend:1.0.0
                    │                     │
                    └──────────┬──────────┘
                               ▼
                          install.sh
                               │
                               ▼
                        Docker Compose
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
        Nginx                Next.js              Laravel
                                                     │
                                            ┌────────┴────────┐
                                            ▼                 ▼
                                        PostgreSQL           Redis
                                            │
                                            ▼
                                     Persistent Data
                                            │
                                            ▼
                                      IMS Installation
                                            │
                                            ▼
                                         /setup
                                            │
                                            ▼
                                       /dashboard
```

---

# 34. Definition of Done

## Architecture

- [ ] Application images contain no customer secrets.
- [ ] Frontend and backend use separate images.
- [ ] PostgreSQL and Redis remain separate services.
- [ ] Docker Compose orchestrates the complete application.
- [ ] Persistent volumes are configured.

## Configuration

- [ ] `.env.example` exists.
- [ ] Runtime `.env` is external to images.
- [ ] Infrastructure settings use runtime configuration.
- [ ] Application settings use PostgreSQL.
- [ ] Application secrets are encrypted.
- [ ] APP_KEY is unique and persistent.

## Onboarding

- [ ] Fresh installations enter `/setup`.
- [ ] Existing installations bypass `/setup`.
- [ ] Admin onboarding works.
- [ ] Store configuration works.
- [ ] Integration configuration works.
- [ ] Credential validation works.
- [ ] Installation can be completed transactionally.
- [ ] Setup is locked after completion.

## CI/CD

- [ ] GitHub Actions validates the project.
- [ ] Docker images are built automatically.
- [ ] Images are published to GHCR.
- [ ] Images have versioned tags.
- [ ] Production deployments use explicit versions.

## Operations

- [ ] `install.sh` works.
- [ ] `update.sh` works.
- [ ] `backup.sh` works.
- [ ] Rollback procedure exists.
- [ ] Health checks exist.
- [ ] Backup restoration has been tested.

## Security

- [ ] No secrets exist in Git.
- [ ] No secrets exist in Docker images.
- [ ] No private secrets are exposed to Next.js/browser.
- [ ] Setup APIs cannot be bypassed.
- [ ] Secrets are not logged.
- [ ] Authentication/authorization is enforced.
- [ ] Deployment permissions are controlled.

---

# 35. Architecture Rules

These rules should be maintained throughout future development.

```text
Docker image
    = application software

Runtime environment
    = deployment/infrastructure configuration

PostgreSQL
    = IMS data + application configuration

Encrypted database values
    = application secrets

Docker volumes
    = persistent installation data

GitHub Actions
    = build/test/release automation

GHCR
    = application image distribution

Docker Compose
    = complete service orchestration

install.sh
    = single installation entry point

/setup
    = first-run application configuration
```

The final objective is:

```text
ONE INSTALLATION
      +
MULTIPLE PROPER CONTAINERS
      +
IMMUTABLE VERSIONED IMAGES
      +
EXTERNAL RUNTIME CONFIGURATION
      +
PERSISTENT DATA
      +
SECURE FIRST-RUN ONBOARDING
```

This allows the exact same IMS release to be installed for multiple users/customers without rebuilding the application or embedding customer-specific credentials into the Docker images.
