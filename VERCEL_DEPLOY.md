# Vercel Deploy Checklist

## Build settings

- Framework preset: Other
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave empty

## Environment variables

Add these variables in Vercel Project Settings -> Environment Variables for Production, Preview, and Development:

```text
SUPABASE_URL=https://wtrhupgspcrsuzrkepth.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
VITE_SUPABASE_PROJECT_ID=wtrhupgspcrsuzrkepth
VITE_SUPABASE_URL=https://wtrhupgspcrsuzrkepth.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
NITRO_PRESET=vercel
```

If email OTP is used, also add:

```text
RESEND_API_KEY=<resend key>
```

If backend AI/Gemini features are added, also add:

```text
GEMINI_API_KEY=<Gemini API key>
GEMINI_MODEL=gemini-2.5-flash-lite
```

## Database migrations

This app reads and writes Supabase tables created by the SQL files in `supabase/migrations/`.
Migrations are SQL files that create or update database tables, policies, and functions.

The Supabase project ref is the part before `.supabase.co` in the project URL. For this project it is:

```text
wtrhupgspcrsuzrkepth
```

Before redeploying, make sure the migrations have been applied to the target Supabase project. If the Supabase CLI is configured, run:

```text
supabase link --project-ref wtrhupgspcrsuzrkepth
supabase db push
```

If the CLI is not logged in or you do not have the database password, open Supabase SQL Editor for the same project and run the migration SQL files in timestamp order.

## Important

- Never add `SUPABASE_SERVICE_ROLE_KEY` with a `VITE_` prefix.
- `VITE_*` variables are public and are included in browser code.
- Rotate the service-role key in Supabase if it has been shared outside Vercel/local secret storage.
- After adding or changing Vercel environment variables, redeploy the project.
- `VERCEL_ENV_IMPORT.local.env` and `VERCEL_ENV_VALUES.local.md` are local handoff files only and must stay ignored by Git.
