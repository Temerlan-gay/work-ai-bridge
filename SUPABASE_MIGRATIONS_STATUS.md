# Supabase migrations status

Project ref: `sqvnckkatskkyngbanlh`

This repo has SQL migrations in `supabase/migrations/`. They need to be applied to the Supabase project before the deployed app can read or write its required tables.

## Current check

On 2026-06-08, Supabase CLI was linked to the configured project and all local migrations were pushed to the remote database.

REST checks against the configured Supabase project returned `200 OK` for these expected tables:

```text
profiles
projects
skill_catalog
email_verification_codes
workcoin_wallets
```

That means the target Supabase database has the required tables.

## Automated commands

Run these from the project root after logging in to Supabase when new migrations are added:

```bash
npx supabase login
npm run db:link
npm run db:push:dry
npm run db:push
```

The scripts use the project ref from `supabase/config.toml`.

## Current blocker

The local machine is logged in to Supabase CLI and is linked to the project ref `sqvnckkatskkyngbanlh`.

```text
Project linked successfully.
```

If `db push` asks for the database password, get it from Supabase Project Settings -> Database.

## Manual alternative

Open Supabase Dashboard -> SQL Editor for project `sqvnckkatskkyngbanlh`, then run every SQL file in `supabase/migrations/` in filename order.
