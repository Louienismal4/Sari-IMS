# Sari-IMS: Configuration Guide

Sari-IMS enforces a strict **three-tier configuration architecture** separating infrastructure from business settings and application secrets.

---

## 1. The Three-Tier Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. RUNTIME INFRASTRUCTURE CONFIGURATION                     │
│    Location: deploy/.env (Host / Container environment)     │
│    Scope: Ports, database passwords, network endpoints      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. APPLICATION DOMAIN CONFIGURATION                         │
│    Location: PostgreSQL (settings and stores tables)        │
│    Scope: Store name, currency, timezone, markup %          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. ENCRYPTED APPLICATION SECRETS                            │
│    Location: PostgreSQL (integration_credentials table)     │
│    Encryption: AES-256-CBC via Laravel APP_KEY              │
│    Scope: Gemini AI keys, third-party webhook tokens        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Tier 1: Runtime Environment Variables (`deploy/.env`)

These settings are strictly read by Docker Compose during container startup:

```env
# Production Domain & Web Server
DOMAIN=sari.example.com
PORT=80

# Application Cryptographic Master Key
APP_KEY=base64:YOUR_GENERATED_MASTER_KEY_HERE=

# PostgreSQL Database Credentials
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=sari_inventory
DB_USERNAME=sari_prod_user
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD_HERE

# Redis Cache Credentials
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Container Image Ownership (for GHCR pull)
DOCKER_IMAGE_OWNER=louienismal4
TAG=latest
```

> [!WARNING]
> Never commit `deploy/.env` or `.env` to Git version control. Only `.env.example` templates may be tracked in Git.

---

## 3. Tier 2: Application Domain Settings

Application settings are maintained entirely inside PostgreSQL:

* **Store Profile (`stores` table)**:
  * Store Name (`name`)
  * Store Owner (`owner_name`)
  * Physical Address (`address`)
  * Timezone (`timezone`, default: `Asia/Manila`)
  * Currency Code & Symbol (`currency`, `currency_symbol`, e.g. `PHP`, `₱`)
  * Target Margin Markup Percentage (`target_markup_percentage`, default: `20.00%`)
  * Default Reorder Threshold (`default_reorder_level`, default: `5`)
* **Key-Value Settings (`settings` table)**:
  * `store.name`
  * `store.currency`
  * `store.currency_symbol`
  * `inventory.default_reorder_level`
  * `inventory.allow_negative_stock`

---

## 4. Tier 3: Encrypted Secrets (`integration_credentials`)

Sensitive customer integration secrets (such as Google Gemini API keys) are never kept in plain text or `.env` files:

1. **Encryption**: Encrypted via AES-256-CBC using Laravel's `APP_KEY`.
2. **Persistence**: Stored in the `integration_credentials` database table.
3. **Decryption**: Decrypted on-the-fly inside `IntegrationCredentialService` exclusively during backend server execution.
4. **Preview Security**: When queried via `/api/installation/status` or Settings UI, only a masked representation is returned (e.g. `AIza...4F2x`). Plaintext secrets are never transmitted to the browser bundle.
