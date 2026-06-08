# Supabase migrations status

Project ref: `wtrhupgspcrsuzrkepth`

This repo has SQL migrations in `supabase/migrations/`. They need to be applied to the Supabase project before the deployed app can read or write its required tables.

## Current check

On 2026-06-08, local public REST checks against the configured Supabase project returned `404 Not Found` for these expected tables:

```text
profiles
projects
skill_catalog
email_verification_codes
workcoin_wallets
```

That means the target Supabase database likely does not have the migrations applied yet.

## Automated commands

Run these from the project root after logging in to Supabase:

```bash
npx supabase login
npm run db:link
npm run db:push:dry
npm run db:push
```

The scripts use the project ref from `supabase/config.toml`.

## Current blocker

The local machine is not logged in to Supabase CLI. `npx supabase link --project-ref wtrhupgspcrsuzrkepth` fails with:

```text
Access token not provided. Supply an access token by running `supabase login` or setting the SUPABASE_ACCESS_TOKEN environment variable.
```

No Supabase access token or database password is currently available in the local ignored env files.

## Manual alternative

Open Supabase Dashboard -> SQL Editor for project `wtrhupgspcrsuzrkepth`, then run every SQL file in `supabase/migrations/` in filename order.
