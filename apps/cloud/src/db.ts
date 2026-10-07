import pg from 'pg'

import { config } from './config.js'

export const pool = new pg.Pool({ connectionString: config.controlDatabaseUrl, max: 10 })

/** Idempotent schema for the control plane. Runs on every boot. */
const MIGRATIONS = `
create schema if not exists nicerbase;

create table if not exists nicerbase.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists nicerbase.sessions (
  token_hash text primary key,
  user_id uuid not null references nicerbase.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on nicerbase.sessions(user_id);

create table if not exists nicerbase.projects (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  owner_id uuid not null references nicerbase.users(id) on delete cascade,
  name text not null,
  engine text not null check (engine in ('postgres', 'mongodb')),
  status text not null default 'provisioning'
    check (status in ('provisioning', 'active', 'failed', 'deleting')),
  database_name text not null,
  username text not null,
  password_encrypted text not null,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists projects_owner_idx on nicerbase.projects(owner_id);
`

export async function migrate() {
  await pool.query(MIGRATIONS)
  await pool.query('delete from nicerbase.sessions where expires_at < now()')
}
