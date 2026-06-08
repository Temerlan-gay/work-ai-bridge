# Deployment rules for this project

This repository uses TanStack Start with Nitro server rendering and deploys on Vercel.

## Vercel build settings

- Root Directory: project root
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: leave empty
- Framework Preset: Other
- Keep `vercel.json` in the repo with `installCommand` and `buildCommand` so Vercel does not misdetect the package manager.
- Keep `NITRO_PRESET=vercel` in Vercel environment variables or in `vercel.json`.

## Environment variable safety

- Never commit `.env` or `.env.*`.
- Add `.env`, `.env.*`, `VERCEL_ENV_IMPORT.local.env`, and `VERCEL_ENV_VALUES.local.md` to `.gitignore`.
- Keep `.env.example` committed with placeholders only, no real secret values.
- Do not put private secrets in browser-visible env vars.
- Public frontend safe vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Backend-only secret vars:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`
  - `RESEND_API_KEY`
- Never prefix a secret backend-only key with `VITE_`.

## Supabase rules

- `SUPABASE_URL` must be the Supabase project URL: `https://PROJECT_REF.supabase.co`.
- `SUPABASE_PUBLISHABLE_KEY` is the client-safe anon/public key.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PROJECT_ID` are used in frontend client config.
- `SUPABASE_SERVICE_ROLE_KEY` is required only for server-side admin operations in `src/integrations/supabase/client.server.ts` and should stay server-only.
- The current local Supabase project ref is `wtrhupgspcrsuzrkepth`.

## AI and Gemini rules

- If AI features are added, use `GEMINI_API_KEY` as a backend/server-only secret.
- Default model value for student projects: `gemini-2.5-flash-lite`.
- Do not export `GEMINI_API_KEY` to the browser or put it in any `VITE_*` variable.

## Migration and schema checks

- This repo includes Supabase migrations in `supabase/migrations/` and `supabase/config.toml`.
- The project ref from `supabase/config.toml` is `wtrhupgspcrsuzrkepth`.
- Apply migrations before deployment if the target Supabase database does not have the required tables.
- If Supabase returns a missing table error, run migrations manually in the Supabase SQL editor or use the Supabase CLI with the correct project ref.

## Before deploy checklist

1. `.env` is ignored and `.env.example` is committed.
2. `vercel.json` includes explicit `installCommand` and `buildCommand`.
3. `NITRO_PRESET=vercel` is set in Vercel env vars or in `vercel.json`.
4. Required Vercel environment variables are configured for Production, Preview, and Development.
5. Local `npm install` and `npm run build` succeed.
6. Server-only secrets are not exposed under `VITE_*`.
