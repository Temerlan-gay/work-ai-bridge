# WorkBridge MVP Build Plan

A full freelance marketplace built on TanStack Start + Lovable Cloud (Supabase). Delivered in phases so each chunk is testable.

## Phase 1 — Backend & Auth Foundation
- Enable Lovable Cloud (Postgres + Auth + Storage).
- Schema (migrations):
  - `profiles` (id→auth.users, full_name, nickname, avatar_url, role enum: freelancer/client, bio, country, city, age, specialization, skills[], languages[], links jsonb, created_at)
  - `user_roles` (separate table, `app_role` enum, `has_role()` security-definer fn)
  - `portfolio_items` (user_id, title, description, image_url, link)
  - `projects` (client_id, title, description, category, budget, deadline, status, created_at)
  - `proposals` (project_id, freelancer_id, message, price, status)
  - `chats` + `messages` (sender_id, chat_id, body, image_url, read_at)
  - `reviews` (project_id, from_user, to_user, rating 1–5, comment)
  - `notifications` (user_id, type, payload, read_at)
- RLS policies on every table + GRANTs.
- Storage buckets: `avatars`, `portfolio`, `chat-images` (public read where appropriate).
- Trigger: auto-create profile row on signup.

## Phase 2 — Auth UI
- `/login`, `/register`, `/forgot-password`, `/reset-password`.
- Email/password + Google OAuth (via Lovable broker).
- `_authenticated` layout with redirect guard; root `onAuthStateChange` invalidation.
- Multi-step onboarding `/onboarding` (role pick → personal info → skills/links → save).

## Phase 3 — Dashboard (Personal Cabinet)
Sidebar layout with sections:
- About me / profile edit
- Portfolio (CRUD + image uploads)
- Orders (client: my projects; freelancer: active jobs)
- Messages (chat list)
- Notifications
- Settings (change email/password, delete account, theme)
- Stats (completed projects, earnings, avg rating)

## Phase 4 — Projects & Search
- `/projects/new` (client creates: title, desc, category, budget, deadline, photos).
- `/projects` browse: filters by category, budget, rating, country; search box.
- `/projects/$id` detail + proposal submission for freelancers.
- `/freelancers` browse with rating filter.

## Phase 5 — Chat
- Realtime messages via Supabase realtime.
- Reply, send images, online presence indicator, read receipts.

## Phase 6 — Reviews & Ratings
- On project completion, client leaves 1–5 star review + comment.
- Aggregate rating shown on freelancer profile.

## Phase 7 — Polish
- Light/Dark theme (already in place — softened).
- Mobile-first responsive across all pages.
- Smooth animations (Framer Motion).
- Empty states, loading skeletons, toasts.

## Technical Notes
- Stack: TanStack Start (already configured), Tailwind v4, shadcn/ui, Supabase (Lovable Cloud), TanStack Query, Zod validation, Framer Motion.
- All data access via `createServerFn` with `requireSupabaseAuth`; storage uploads from browser using user-scoped client.
- Roles stored in `user_roles` table (never on profile) with `has_role()` SECURITY DEFINER.

## Question before I start
This is a 2–3 day build compressed into automated steps. I'll start with **Phase 1 + 2** (backend schema + auth + onboarding) so you can register and log in, then continue with dashboard, projects, chat, and reviews in subsequent turns.

Confirm and I'll enable Lovable Cloud and begin Phase 1.