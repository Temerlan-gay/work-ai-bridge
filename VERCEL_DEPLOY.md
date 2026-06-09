# Vercel Deploy Checklist

## Build settings

- Framework preset: Other
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave empty

## Environment variables

Add these variables in Vercel Project Settings -> Environment Variables for Production, Preview, and Development:

```text
SUPABASE_URL=https://sqvnckkatskkyngbanlh.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
VITE_SUPABASE_PROJECT_ID=sqvnckkatskkyngbanlh
VITE_SUPABASE_URL=https://sqvnckkatskkyngbanlh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
NITRO_PRESET=vercel
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
sqvnckkatskkyngbanlh
```

Before redeploying, make sure the migrations have been applied to the target Supabase project. If the Supabase CLI is configured, run:

```text
npm run db:link
npm run db:push:dry
npm run db:push
```

If the CLI is not logged in or you do not have the database password, open Supabase SQL Editor for the same project and run the migration SQL files in timestamp order.

CLI requirements:

- `npx supabase login` or `SUPABASE_ACCESS_TOKEN` must be available before `npm run db:link`.
- If the CLI asks for the database password, get it from Supabase Project Settings -> Database.
- Do not commit Supabase access tokens, database passwords, or service-role keys.

## Google login

Google login uses Supabase Auth OAuth directly. To enable it:

1. In Supabase Dashboard -> Authentication -> Providers -> Email, turn off Confirm email and save if signups should work without email confirmation.
2. In Supabase Dashboard -> Authentication -> Providers -> Google, enable Google and copy the Supabase Callback URL.
3. In Google Cloud Console, create an OAuth client for a Web application.
4. Add the Supabase Callback URL as an Authorized redirect URI. For this Supabase project it should be:

```text
https://sqvnckkatskkyngbanlh.supabase.co/auth/v1/callback
```

5. Copy the Google Client ID and Client Secret into Supabase Dashboard -> Authentication -> Providers -> Google, then save.
6. In Supabase Dashboard -> Authentication -> URL Configuration, set the production Site URL and add redirect URLs for every app URL that should work:

```text
http://localhost:5173/**
http://127.0.0.1:8080/**
https://YOUR_VERCEL_DOMAIN/**
https://YOUR_VERCEL_PREVIEW_DOMAIN/**
```

After changing auth provider or URL settings, test email signup and Google login again from the deployed domain.

## Important

- Never add `SUPABASE_SERVICE_ROLE_KEY` with a `VITE_` prefix.
- `VITE_*` variables are public and are included in browser code.
- Rotate the service-role key in Supabase if it has been shared outside Vercel/local secret storage.
- After adding or changing Vercel environment variables, redeploy the project.
- `VERCEL_ENV_IMPORT.local.env` and `VERCEL_ENV_VALUES.local.md` are local handoff files only and must stay ignored by Git.

## Troubleshooting auth project mismatch

If the browser console shows Supabase auth requests going to a project URL other than `https://sqvnckkatskkyngbanlh.supabase.co`, update both local env files and Vercel env vars.

For local development, remember that `.env.local` overrides `.env` during Vite builds.

The app validates the Supabase project ref at runtime. If Vercel still has stale values, it will fail loudly with a project mismatch message instead of silently talking to the wrong Supabase project.

For Vercel, update these variables and redeploy so the browser bundle is rebuilt:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```
