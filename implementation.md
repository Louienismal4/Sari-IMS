# IMS Runtime Configuration & First-Run Onboarding

## 1. Objective

Refactor the IMS deployment architecture so that:

* Docker images contain application code and dependencies only.
* Customer-specific credentials are never baked into Docker images.
* Runtime infrastructure configuration is supplied externally.
* First-time users complete setup through a web-based onboarding flow.
* Application-level configuration is stored in PostgreSQL.
* Sensitive application credentials are encrypted at rest.
* Installation state survives container recreation and upgrades.
* Existing installations can be upgraded without losing configuration or data.

### Target Stack

* Frontend: Next.js
* Backend: Laravel
* Database: PostgreSQL
* Cache/queue: Redis
* Deployment: Docker + Docker Compose

---

# 2. Target Architecture

```text
                     Docker Registry
                            │
                            ▼
                    Immutable Images
              ┌─────────────────────────┐
              │ Next.js                 │
              │ Laravel                 │
              │ Dependencies            │
              │ .env.example only       │
              │ No customer secrets     │
              └────────────┬────────────┘
                           │
                           ▼
                    Docker Compose
                           │
             ┌─────────────┼─────────────┐
             │             │               │
             ▼             ▼               ▼
          Next.js       Laravel        PostgreSQL
             │             │               │
             │             │            persistent
             │             │              volume
             │             │               │
             │             └───────┬───────┘
             │                     │
             │                     ▼
             │              Installation State
             │                     │
             └─────────────────────┤
                                   ▼
                              /setup
                                   │
                     ┌─────────────┼─────────────┐
                     ▼             ▼             ▼
                   Admin         Store      Integrations
                  Account       Config       & Secrets
                     │             │             │
                     └─────────────┼─────────────┘
                                   ▼
                              PostgreSQL
                                   │
                                   ▼
                              /dashboard
```

---

# 3. Configuration Classification

All existing environment/configuration values must be classified into one of three categories.

## 3.1 Runtime / Infrastructure Configuration

These are values required for the application to start.

Examples:

```env
APP_KEY=
APP_ENV=production
APP_DEBUG=false

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=ims
DB_USERNAME=ims
DB_PASSWORD=

REDIS_HOST=redis
REDIS_PORT=6379
```

These remain runtime environment configuration.

---

## 3.2 Application Configuration

These are settings that belong to the IMS installation rather than the Docker deployment.

Examples:

```text
Store name
Store address
Timezone
Currency
Inventory settings
Notification preferences
Business rules
Feature settings
```

These should be stored in PostgreSQL.

---

## 3.3 Application Secrets

Examples:

```text
Shopify API key
Shopify API secret
Payment gateway credentials
Webhook secrets
External service tokens
SMTP passwords
```

These must:

* Never be baked into Docker images.
* Never be committed to Git.
* Never be returned to the frontend unnecessarily.
* Never be logged.
* Be encrypted before storage in PostgreSQL.
* Only be decrypted server-side when required.

---

# 4. Phase 1 — Audit Existing Configuration

## Goal

Identify every place where configuration or credentials are currently stored.

## Tasks

### 4.1 Audit repository

Search for:

```text
.env
.env.*
APP_KEY
DB_PASSWORD
API_KEY
API_SECRET
TOKEN
SECRET
PASSWORD
NEXT_PUBLIC_
```

Also inspect:

```text
Dockerfile
docker-compose.yml
compose.yaml
GitHub Actions
deployment scripts
Laravel config/*
Next.js configuration
CI/CD variables
```

### 4.2 Identify secrets baked into images

Remove patterns such as:

```dockerfile
COPY .env /app/.env
```

```dockerfile
ARG API_KEY
```

```dockerfile
ENV API_KEY=...
```

when they contain customer-specific or sensitive credentials.

### 4.3 Review Git history

Confirm that production/customer credentials have not been committed.

If credentials were previously committed:

1. Revoke them.
2. Generate replacements.
3. Remove them from source/history where appropriate.
4. Ensure `.gitignore` prevents recurrence.

## Acceptance Criteria

* No customer credentials exist in Dockerfiles.
* No production secrets exist in Git.
* All existing configuration values have been classified.

---

# 5. Phase 2 — Introduce `.env.example`

## Goal

Provide a template without actual secrets.

Create:

```text
deploy/
└── .env.example
```

Example:

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

Do not put actual production credentials into this file.

Add the real runtime environment file to `.gitignore`:

```gitignore
.env
.env.*
!.env.example

deploy/data/
```

Adjust the ignore rules to match the actual project structure.

## Acceptance Criteria

* `.env.example` can be committed.
* Real `.env` files are ignored.
* A clean checkout contains no customer secrets.

---

# 6. Phase 3 — Refactor Docker Images

## Goal

Make Docker images immutable and portable.

## Backend Image

The Laravel image should contain:

```text
PHP
Composer dependencies
Laravel application
Application configuration defaults
```

It must not contain:

```text
Customer .env
Customer API secrets
Customer database passwords
Customer-specific configuration
```

## Frontend Image

The Next.js image must not contain:

```text
Customer API secrets
Database credentials
Private integration credentials
```

Be especially careful with:

```env
NEXT_PUBLIC_*
```

Values exposed through `NEXT_PUBLIC_*` should be considered browser-visible.

## Acceptance Criteria

Run:

```bash
docker image inspect <image>
```

and inspect the image filesystem to verify that customer credentials are absent.

---

# 7. Phase 4 — Runtime Docker Configuration

## Goal

Supply infrastructure configuration at runtime rather than build time.

Recommended structure on the deployment server:

```text
/opt/ims/
├── compose.yaml
├── data/
│   └── .env
├── postgres/
└── backups/
```

The exact layout may differ, but runtime configuration must live outside the immutable application image.

## Compose Example

```yaml
services:

  frontend:
    image: your-registry/ims-frontend:latest
    depends_on:
      - backend

  backend:
    image: your-registry/ims-backend:latest
    env_file:
      - ./data/.env
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: ims
      POSTGRES_USER: ims
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

The exact versions should be pinned deliberately for the project.

## Acceptance Criteria

Verify:

```bash
docker compose down
docker compose up -d
```

does not remove:

* PostgreSQL data
* Redis persistence where applicable
* Runtime configuration
* Application persistent files

---

# 8. Phase 5 — Database Initialization Strategy

## Decision

Assume PostgreSQL is part of the IMS Docker deployment.

Therefore, users should **not** need to enter PostgreSQL credentials in the normal web onboarding flow.

Docker Compose provisions the PostgreSQL service, while Laravel receives its connection information through runtime configuration.

Target flow:

```text
Docker Compose
      │
      ▼
PostgreSQL starts
      │
      ▼
Laravel connects to PostgreSQL
      │
      ▼
Laravel checks installation state
      │
      ▼
/setup
```

## External Database Support

If external customer databases are required later, treat that as a separate feature.

Do not introduce external-database complexity into the initial implementation unless it is a confirmed requirement.

---

# 9. Phase 6 — Installation State

## Goal

Allow the application to determine whether it is a fresh installation or an existing installation.

Create:

```text
installations
```

Suggested schema:

```text
id
status
version
installed_at
created_at
updated_at
```

Initial status:

```text
pending
```

Completed status:

```text
completed
```

Optional states:

```text
installing
failed
```

## Migration

Create a Laravel migration:

```bash
php artisan make:migration create_installations_table
```

## Model

Create:

```text
Installation
```

## Service

Create:

```text
InstallationService
```

## Acceptance Criteria

Laravel can reliably determine:

```text
installed = false
```

for a new installation and:

```text
installed = true
```

after installation.

---

# 10. Phase 7 — Installation Status API

Create:

```http
GET /api/installation/status
```

Example fresh installation response:

```json
{
  "installed": false
}
```

Example completed response:

```json
{
  "installed": true
}
```

Do not expose sensitive configuration through this endpoint.

---

# 11. Phase 8 — Installation Middleware

Create:

```text
InstallationMiddleware
```

Behavior:

```text
Request
   │
   ▼
Check installation status
   │
   ├── pending ──► allow setup routes
   │
   └── completed ─► allow normal application
```

Setup routes must be explicitly whitelisted.

Examples:

```text
/api/installation/status
/api/setup/*
```

After installation is complete, setup endpoints must reject requests.

Example:

```http
403 Installation already completed
```

Do not rely only on frontend routing for this protection.

---

# 12. Phase 9 — Next.js Setup Route

Create:

```text
/setup
```

On initial load:

```text
GET /api/installation/status
```

Behavior:

```text
installed = false
    ↓
show setup wizard

installed = true
    ↓
redirect to /login
```

Do not expose secrets in the frontend state.

---

# 13. Phase 10 — Setup Wizard

Implement the onboarding flow as a multi-step wizard.

Recommended sequence:

```text
Step 1
Welcome

        ↓

Step 2
Administrator

        ↓

Step 3
Store Configuration

        ↓

Step 4
Integrations

        ↓

Step 5
Verification

        ↓

Step 6
Finish
```

---

# 14. Phase 11 — Administrator Setup

Collect:

```text
Name
Email
Password
```

Create the first administrative user.

Use Laravel's normal password hashing system.

Do not store passwords manually or in plaintext.

## Validation

Implement:

```text
Required fields
Email validation
Password strength
Duplicate email check
```

---

# 15. Phase 12 — Store Configuration

Create a store model/table.

Suggested structure:

```text
stores
────────────────────
id
name
address
timezone
currency
contact_information
created_at
updated_at
```

Store onboarding data in PostgreSQL.

Do not put store business information into `.env`.

---

# 16. Phase 13 — Application Settings

Create a settings abstraction.

Example:

```text
settings
────────────────────
id
key
value
created_at
updated_at
```

Potential settings:

```text
inventory.default_reorder_level
inventory.allow_negative_stock
notifications.enabled
store.timezone
store.currency
```

Prefer typed/domain-specific configuration where practical rather than turning the settings table into an unstructured dumping ground.

---

# 17. Phase 14 — Integration Credentials

Create:

```text
integration_credentials
```

Suggested schema:

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
provider = shopify
key = api_secret
encrypted_value = <encrypted>
```

Do not store:

```text
shopify_api_secret = plaintext
```

---

# 18. Phase 15 — Secret Encryption Service

Create:

```text
IntegrationCredentialService
```

Responsibilities:

```text
store()
get()
update()
delete()
exists()
```

Conceptual flow:

```text
User
 │
 ▼
Laravel
 │
 ▼
IntegrationCredentialService
 │
 ├── encrypt
 │
 ▼
PostgreSQL
```

When used:

```text
PostgreSQL
 │
 ▼
decrypt
 │
 ▼
Laravel service
 │
 ▼
external API
```

The frontend should never receive the decrypted secret.

---

# 19. Phase 16 — Integration Testing

Every integration should support a connection test before being finalized.

Example:

```http
POST /api/setup/integrations/shopify/test
```

Flow:

```text
User enters credentials
        ↓ 
Validate input
        ↓
Test external API
        ↓
Success?
   ┌────┴────┐
   │         │
  yes        no
   │         │
 save       return
secret      safe error
```

Error responses must not contain:

* API secrets
* passwords
* authorization headers
* connection strings

---

# 20. Phase 17 — Final Installation Verification

Before marking installation complete, validate:

```text
✓ Database connection
✓ Database migrations
✓ Redis connection
✓ Storage writable
✓ Admin account exists
✓ Store exists
✓ Required settings exist
✓ Integration configuration valid
✓ Encryption/decryption works
```

Only after all required checks pass:

```text
installations.status = completed
```

---

# 21. Phase 18 — Transactional Installation Completion

The final installation action should execute inside a database transaction where practical.

Conceptually:

```text
BEGIN TRANSACTION

Check installation state

Create/update installation data
Create admin
Create store
Create required configuration
Save integrations
Mark installation completed

COMMIT
```

If a required operation fails:

```text
ROLLBACK
```

The installation should remain recoverable.

---

# 22. Phase 19 — Prevent Concurrent Installation

Protect the final installation process against two administrators performing setup simultaneously.

Example:

```text
Browser A ─┐
           ├──► installation lock
Browser B ─┘
```

The backend must re-check installation state while holding the appropriate lock/transaction.

This prevents:

* Duplicate initial administrators
* Partial configuration
* Conflicting installation states

---

# 23. Phase 20 — Laravel Configuration Cache

The deployment process must account for Laravel configuration caching.

After configuration changes that affect Laravel's runtime configuration:

```bash
php artisan config:clear
```

or rebuild the configuration cache as part of the deployment strategy.

Do not assume editing a runtime configuration source immediately changes already-cached Laravel configuration.

Define one authoritative configuration lifecycle and document it.

---

# 24. Phase 21 — APP_KEY Management

Generate a unique `APP_KEY` per installation.

Requirements:

* Never hard-code a universal key into the image.
* Never regenerate the key on every restart.
* Persist the key.
* Back it up securely.
* Treat it as a critical secret.

The same key must remain available to the installation because encrypted application data depends on it.

---

# 25. Phase 22 — Next.js Security Review

Audit all frontend environment variables.

Especially inspect:

```text
NEXT_PUBLIC_*
```

Ensure no value containing:

```text
API secret
database password
private token
payment secret
integration credential
```

is exposed to the browser.

Preferred architecture:

```text
Browser
   ↓
Next.js
   ↓
Laravel
   ↓
External API
```

not:

```text
Browser
   ↓
External API using private credential
```

---

# 26. Phase 23 — Health Checks

Add backend health endpoints.

Example:

```http
GET /health
GET /health/ready
```

Potential checks:

```text
Application available
Database available
Redis available
```

Never expose secrets through health endpoints.

Docker Compose should use health checks where appropriate.

---

# 27. Phase 24 — Installation Script

Create:

```text
deploy/scripts/install.sh
```

Responsibilities:

```text
1. Verify Docker exists
2. Verify Docker Compose
3. Create deployment directory
4. Create persistent directories
5. Generate runtime configuration
6. Generate unique secrets
7. Start infrastructure
8. Run migrations
9. Start application
10. Print installation URL
```

Example user flow:

```bash
./install.sh
```

Then:

```text
Open:
http://<server>
```

The web UI handles application onboarding.

---

# 28. Phase 25 — Update Script

Create:

```text
deploy/scripts/update.sh
```

Responsibilities:

```text
1. Backup database
2. Pull new images
3. Stop/recreate application containers as required
4. Run migrations
5. Rebuild/reload runtime caches
6. Run health checks
7. Report success/failure
```

Never remove persistent volumes during a normal update.

---

# 29. Phase 26 — Backup Strategy

Back up at least:

```text
PostgreSQL
Runtime configuration
APP_KEY
Persistent uploaded files
Other application persistent data
```

Create:

```text
deploy/scripts/backup.sh
```

Backups should be stored separately from the primary container host when possible.

Test restoration, not just backup creation.

---

# 30. Phase 27 — Logging and Secret Redaction

Audit all logs.

Ensure secrets are never printed through:

```text
request logs
exception logs
debug logs
integration errors
database connection errors
Docker logs
CI/CD logs
```

Examples of values that must be redacted:

```text
password
Authorization header
API secret
access token
database connection string
```

---

# 31. Phase 28 — Installation Locking and Security

After successful installation:

```text
/setup
```

must no longer be usable.

Backend authorization is mandatory.

Also implement:

```text
Rate limiting
Input validation
Secure password hashing
CSRF protection where applicable
HTTPS in production
Secure cookies
Authentication
Authorization
```

---

# 32. Phase 29 — Test Fresh Installation

Perform a clean installation test.

Test:

```text
docker compose up
       ↓
open browser
       ↓
/setup
```

Verify:

```text
✓ Setup appears
✓ Admin creation works
✓ Store creation works
✓ Integration setup works
✓ Connection tests work
✓ Installation completes
✓ User reaches login
✓ Dashboard loads
```

---

# 33. Phase 30 — Test Container Recreation

Run:

```bash
docker compose down
docker compose up -d
```

Verify:

```text
✓ Installation remains completed
✓ Admin remains
✓ Store remains
✓ Database remains
✓ Integration configuration remains
✓ Application starts normally
```

---

# 34. Phase 31 — Test Image Upgrade

Install version:

```text
1.0.0
```

Then upgrade to:

```text
1.1.0
```

Verify:

```text
✓ Customer configuration remains
✓ PostgreSQL data remains
✓ Encrypted secrets remain readable
✓ APP_KEY remains unchanged
✓ Database migrations execute
✓ Application starts normally
✓ No onboarding reset occurs
```

---

# 35. Phase 32 — Test Failure Recovery

Test failures at:

```text
Database connection
Redis connection
Integration connection
Migration
Admin creation
Store creation
Final installation
```

Verify:

```text
✓ Failure is reported safely
✓ Credentials are not leaked
✓ Installation remains recoverable
✓ User can retry
✓ Partial configuration does not corrupt the installation
```

---

# 36. Phase 33 — Security Testing

Perform a focused security review covering:

```text
Environment variable leakage
Docker image secrets
Git secret leakage
Frontend bundle leakage
API authorization
Setup endpoint bypass
Setup endpoint replay
Concurrent setup
Credential storage
Credential retrieval
Credential logging
Database permissions
Container permissions
Volume permissions
```

Specifically test whether an unauthenticated user can:

```text
Access /setup after installation
Read integration credentials
Read database credentials
Call setup endpoints directly
Enumerate installation settings
```

---

# 37. Phase 34 — Documentation

Update project documentation.

Create or update:

```text
README.md
docs/installation.md
docs/configuration.md
docs/deployment.md
docs/upgrading.md
docs/backup-restore.md
```

Document:

```text
Prerequisites
Docker installation
Installation command
Setup URL
Persistent data
Configuration
Backup
Restore
Upgrade
Troubleshooting
```

Do not document actual secrets.

---

# 38. Final Project Structure

A reasonable target structure:

```text
ims/
│
├── frontend/
│   ├── app/
│   │   └── setup/
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
│   │       └── Installation/
│   │
│   ├── database/
│   │   └── migrations/
│   │
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
│   └── scripts/
│       ├── install.sh
│       ├── update.sh
│       └── backup.sh
│
├── docs/
│   ├── installation.md
│   ├── configuration.md
│   ├── deployment.md
│   ├── upgrading.md
│   └── backup-restore.md
│
└── README.md
```

---

# 39. Definition of Done

This refactor is complete when all of the following are true:

## Docker

* [ ] Customer secrets are not baked into images.
* [ ] Dockerfiles contain no production credentials.
* [ ] Images are reusable across installations.
* [ ] Persistent volumes are configured correctly.

## Runtime Configuration

* [ ] `.env.example` exists.
* [ ] Real runtime configuration is external to the image.
* [ ] Runtime configuration persists across container recreation.
* [ ] `APP_KEY` is unique per installation and persistent.

## Installation

* [ ] Fresh installations enter `/setup`.
* [ ] Existing installations bypass setup.
* [ ] Setup state is persisted.
* [ ] Setup endpoints are backend-protected.
* [ ] Concurrent installations are prevented.

## Application Configuration

* [ ] Store configuration is stored in PostgreSQL.
* [ ] Application settings are stored in PostgreSQL.
* [ ] Integration credentials are encrypted.
* [ ] Secrets are only decrypted server-side.

## Next.js

* [ ] No private secrets are exposed through `NEXT_PUBLIC_*`.
* [ ] Browser requests use the Laravel backend for private operations.

## Deployment

* [ ] `install.sh` works on a clean machine.
* [ ] `update.sh` updates an existing installation safely.
* [ ] `backup.sh` produces restorable backups.
* [ ] Health checks are implemented.
* [ ] Deployment documentation exists.

## Testing

* [ ] Fresh installation tested.
* [ ] Container recreation tested.
* [ ] Upgrade tested.
* [ ] Failure recovery tested.
* [ ] Secret leakage tested.
* [ ] Setup bypass tested.
* [ ] Backup/restore tested.

---

# 40. Final Architecture Principle

The implementation should follow this rule throughout the project:

```text
┌──────────────────────────────────────────┐
│ Docker Image                             │
│                                          │
│ Application code                         │
│ Dependencies                             │
│ Defaults                                 │
│ NO CUSTOMER SECRETS                      │
└───────────────────┬──────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│ Runtime Configuration                    │
│                                          │
│ APP_KEY                                  │
│ Database connection                      │
│ Redis connection                         │
│ Deployment-specific values               │
└───────────────────┬──────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│ PostgreSQL                               │
│                                          │
│ Users                                    │
│ Stores                                   │
│ Settings                                 │
│ Integrations                             │
│ Encrypted application secrets            │
│ Installation state                       │
└──────────────────────────────────────────┘
```

The Docker image represents **the IMS software**.

The runtime configuration represents **the installation environment**.

The PostgreSQL database represents **the customer's IMS data and application configuration**.

This separation is the foundation of the new onboarding architecture.
