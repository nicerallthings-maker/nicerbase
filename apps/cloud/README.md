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

## Before taking paying customers

- **TLS**: put the console behind HTTPS and require TLS on the Postgres and MongoDB ports.
- **Backups**: schedule `pg_dump` / `mongodump` (or volume snapshots) per tenant.
- **Email**: add email verification and password reset (needs an SMTP provider).
- **Legal**: `/terms` and `/privacy` are drafts; have them reviewed.
- **MongoDB license**: MongoDB Community is SSPL. Offering it as a hosted service has
  obligations under SSPL section 13. FerretDB (Apache 2.0, MongoDB wire-compatible) avoids this.
- **Per-project Studio**: projects get connection strings today; a per-tenant Studio
  (dashboard for each customer database) is the next milestone.
