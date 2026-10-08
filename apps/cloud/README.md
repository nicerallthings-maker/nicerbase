# NicerBase Cloud

The multi-tenant console for NicerBase: landing page, sign-up / sign-in, and per-customer
projects backed by an isolated **Postgres** or **MongoDB** database.

It's a dependency-light Node server (`node:http`, `pg`, `mongodb`) that renders plain HTML,
so pages load fast with no client framework.

## What it does

| Area      | Details                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| Accounts  | Email + password sign-up and sign-in. Passwords hashed with scrypt; sessions are random tokens stored as SHA-256 hashes. |
| Projects  | Create, view, rotate password, delete. Engine is Postgres or MongoDB, chosen at creation.                                |
| Data      | Postgres: table browser + SQL editor. MongoDB: collections, filter, insert, delete. Runs as the tenant's own login.      |
| Account   | Email verification, forgot/reset password, change password, delete account (removes every project's database).           |
| Backups   | Daily per-tenant `pg_dump` and `mongodump` with retention (`backup-postgres`, `backup-mongodb` services).                |
| HTTPS     | `docker-compose.cloud.https.yml` adds Caddy with automatic Let's Encrypt certificates.                                   |
| Postgres  | One database + one login role per project. No superuser/createdb/createrole. `CONNECT` revoked from `PUBLIC`.            |
| MongoDB   | One database + one user per project with `dbOwner` on that database only.                                                |
| Secrets   | Tenant passwords are encrypted at rest with AES-256-GCM using `NICERBASE_SECRET_KEY`.                                    |
| Hardening | Same-origin check on every POST, `SameSite=Lax` `HttpOnly` cookies, strict CSP, sign-in/sign-up rate limiting.           |

## Run it with Docker

```bash
cd docker
cp .env.cloud.example .env.cloud   # replace every secret: openssl rand -hex 32
docker compose -f docker-compose.cloud.yml --env-file .env.cloud up -d --build
open http://localhost:4000
```

## Run it locally

```bash
# Needs a Postgres superuser URL (control plane + tenant cluster) and optionally MongoDB
export NICERBASE_SECRET_KEY=$(openssl rand -hex 32)
export NICERBASE_CONTROL_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
export NICERBASE_MONGODB_ADMIN_URL='mongodb://root:root@localhost:27017/?authSource=admin'
pnpm --filter cloud dev
```

| Variable                                                           | Purpose                                                   |
| ------------------------------------------------------------------ | --------------------------------------------------------- |
| `NICERBASE_SECRET_KEY`                                             | Required. Encrypts tenant credentials.                    |
| `NICERBASE_CONTROL_DATABASE_URL`                                   | Required. Superuser connection to the tenant Postgres.    |
| `NICERBASE_MONGODB_ADMIN_URL`                                      | Optional. Enables MongoDB projects.                       |
| `NICERBASE_PUBLIC_URL`                                             | Public console URL. `https://` turns on `Secure` cookies. |
| `NICERBASE_POSTGRES_PUBLIC_HOST` / `NICERBASE_MONGODB_PUBLIC_HOST` | Host shown in customer connection strings.                |
| `NICERBASE_MAX_PROJECTS_PER_USER`                                  | Project quota per account (default 5).                    |

## Going to production

```bash
# In docker/.env.cloud set NICERBASE_DOMAIN, NICERBASE_PUBLIC_URL=https://<domain>,
# and NICERBASE_SMTP_URL (e.g. smtps://user:pass@smtp.example.com:465)
docker compose -f docker-compose.cloud.yml -f docker-compose.cloud.https.yml --env-file .env.cloud up -d --build
```

Encrypt customer database connections too (generates a certificate customers download
from the console, or uses yours from `docker/volumes/cloud-tls`):

```bash
docker compose -f docker-compose.cloud.yml -f docker-compose.cloud.https.yml -f docker-compose.cloud.tls.yml \
  --env-file .env.cloud up -d --build
```

Connection strings then use `sslmode=verify-full` (Postgres) and `tls=true` (MongoDB).

Backups land in `docker/volumes/cloud-backups`; copy them off the server (for example
with `rclone` to object storage) so a lost disk doesn't take the backups with it.

## Still to do before taking paying customers

- **Billing**: pricing is intentionally left for later.
- **Legal**: `/terms` and `/privacy` are drafts; have them reviewed.
- **MongoDB license**: MongoDB Community is SSPL. Offering it as a hosted service has
  obligations under SSPL section 13. FerretDB (Apache 2.0, MongoDB wire-compatible) avoids this.
- **Off-site backups** and monitoring/alerting for the servers.
