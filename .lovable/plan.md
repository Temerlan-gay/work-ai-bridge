## Overview

Build an advanced freelancer registration, profile, and discovery system on top of the existing WorkBridge platform. Most pieces (auth, profiles, portfolio, chats) already exist — this plan extends them with: years of experience, expanded skill catalog with "Other" custom skills, online/availability/registration-date filters, completed-projects metric, ratings aggregation, and a modern filterable directory.

## Database changes (single migration)

Extend existing tables — do not rebuild what's there:

1. **`profiles`** — add columns:
   - `username text unique` (validated lowercase a-z0-9_-, 3-30 chars)
   - `years_experience integer`
   - `availability text` ('available' | 'busy' | 'not_available'), default 'available'
   - `last_seen_at timestamptz` (for online status: online if < 5 min ago)
   - (already exists: full_name, bio, kind, country, city, specialization, skills[], hourly_rate, avatar_url, links, created_at)

2. **`skill_catalog`** — new table for predefined + custom skills:
   - `id uuid pk`, `name text unique`, `category text`, `is_custom bool`, `created_by uuid null`, `created_at`
   - Seeded with the 20 skills from the request (Web Dev, Frontend, Backend, Full Stack, UI/UX, Graphic Design, Mobile, Python, JS, React, Vue, FastAPI, AI Dev, Copywriting, Translation, Video Editing, 3D Modeling, Game Dev, Marketing, SEO)
   - RLS: public SELECT; authenticated INSERT for custom skills

3. **Views / RPC for stats** — a SQL function `get_freelancer_stats(uid)` returning `completed_projects` (count from `projects` where `freelancer_id=uid` and status='completed') and `avg_rating` (avg from `reviews` where `to_user=uid`). Or compute client-side.

4. **`last_seen_at` trigger** — bump on auth via a lightweight `presence` RPC the client calls on a heartbeat.

GRANTs for every new public table; RLS policies scoped properly.

## Registration flow (`/register`)

Single multi-section form (one page, scrollable):
- Avatar upload, username, email, password, full name, bio (textarea)
- Account type toggle: Client / Freelancer
- If Freelancer: years of experience, hourly rate, skills multi-select (with "Other" → custom input that inserts into `skill_catalog`), categories multi-select
- Email verification — keep current Supabase auto-confirm setup (user already disabled email confirmation). Just sign up + insert profile fields + redirect to dashboard. Portfolio upload happens on profile page after signup.

## Profile page (`/_authenticated/profile`)

New route. Lets user edit all above fields + manage portfolio (upload images, title, description, tech tags, link) — uses existing `portfolio_items` table and `portfolio` storage bucket.

## Freelancer directory (`/freelancers`)

Rebuild the existing page with:
- **Filters sidebar (sticky on desktop, sheet on mobile)**:
  - Skills/categories multi-select (from `skill_catalog`)
  - Country dropdown
  - Hourly rate range slider
  - Min rating (stars)
  - Min completed projects
  - Online status toggle (last_seen_at < 5 min)
  - Availability dropdown
  - Registration date range (last week / month / 3 months / year / all)
- **Search bar**: name / username / bio full-text
- **Sort**: rating, rate, recent, most projects
- **Freelancer cards** (responsive grid): avatar, online dot, name + username, bio (truncated), top skills as badges, rating stars + count, completed projects, hourly rate, availability badge, "Message" button (→ creates/opens chat) and "View Profile" button (→ `/freelancers/$username`)

## Public freelancer profile (`/freelancers/$username`)

New route showing full profile + portfolio gallery + reviews + message CTA. SSR-friendly with proper head() meta.

## Presence

Lightweight: on app load (root) and every 60s, authenticated users call a server fn that updates `last_seen_at = now()` on their profile row.

## Technical notes (for devs)

- Add Zod validation for all forms
- Use existing shadcn components (Select, Slider, Checkbox, Sheet, Badge, Card, Avatar)
- Stats query: single SQL view `freelancer_directory` joining profiles + aggregated reviews + project counts — fetched via a public server fn using `supabaseAdmin` (read-only, safe columns)
- Custom skill insertion: server fn with auth, dedupes by lowercased name
- Update `src/lib/categories.ts` with the new SKILL_CATALOG constant as fallback
- Online status computed client-side from `last_seen_at`
- Realtime subscription on profiles for live online indicators (optional, can skip for v1)

## Files to add/edit

**New:**
- migration (profiles columns, skill_catalog table + seed, freelancer_directory view, presence RPC)
- `src/lib/freelancers.functions.ts` (list/search freelancers, get profile, add custom skill, update presence)
- `src/routes/_authenticated/profile.tsx` (edit profile + portfolio)
- `src/routes/freelancers.$username.tsx` (public profile)
- `src/components/freelancer-card.tsx`
- `src/components/freelancer-filters.tsx`
- `src/components/skill-multi-select.tsx`
- `src/components/portfolio-manager.tsx`

**Edit:**
- `src/routes/register.tsx` (extended fields + freelancer step)
- `src/routes/_authenticated/onboarding.tsx` (merge into register, or keep as edit shortcut)
- `src/routes/freelancers.tsx` (full rebuild with filters)
- `src/routes/__root.tsx` (presence heartbeat)
- `src/lib/categories.ts` (SKILL_CATALOG constant)

## Scope / clarifications

- Keeping current auth (email + password, auto-confirm enabled, Google OAuth) — no new verification code flow since you disabled confirmation. Want me to re-enable code verification?
- Portfolio upload moved to profile page (post-signup) to keep registration fast. OK?
- "Completed projects" = count of `projects` rows assigned to the freelancer with `status='completed'`. OK?
