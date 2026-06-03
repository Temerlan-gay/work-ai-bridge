
-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_availability_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_availability_check
  CHECK (availability IN ('available','busy','not_available'));

-- Username format validation (lowercase, alphanumeric, _ -, 3-30 chars)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_check
  CHECK (username IS NULL OR username ~ '^[a-z0-9_-]{3,30}$');

CREATE INDEX IF NOT EXISTS idx_profiles_kind ON public.profiles(kind);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen_at DESC);

-- 2. skill_catalog
CREATE TABLE IF NOT EXISTS public.skill_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  name_lower text GENERATED ALWAYS AS (lower(name)) STORED UNIQUE,
  category text,
  is_custom boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.skill_catalog TO anon, authenticated;
GRANT INSERT ON public.skill_catalog TO authenticated;
GRANT ALL ON public.skill_catalog TO service_role;

ALTER TABLE public.skill_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skill_catalog readable by all"
  ON public.skill_catalog FOR SELECT
  USING (true);

CREATE POLICY "authenticated can add custom skills"
  ON public.skill_catalog FOR INSERT
  TO authenticated
  WITH CHECK (is_custom = true AND created_by = auth.uid());

-- Seed predefined skills
INSERT INTO public.skill_catalog (name, category, is_custom) VALUES
  ('Web Development', 'Development', false),
  ('Frontend Development', 'Development', false),
  ('Backend Development', 'Development', false),
  ('Full Stack Development', 'Development', false),
  ('UI/UX Design', 'Design', false),
  ('Graphic Design', 'Design', false),
  ('Mobile App Development', 'Development', false),
  ('Python', 'Development', false),
  ('JavaScript', 'Development', false),
  ('React', 'Development', false),
  ('Vue.js', 'Development', false),
  ('FastAPI', 'Development', false),
  ('AI Development', 'Development', false),
  ('Copywriting', 'Content', false),
  ('Translation', 'Content', false),
  ('Video Editing', 'Media', false),
  ('3D Modeling', 'Media', false),
  ('Game Development', 'Development', false),
  ('Marketing', 'Marketing', false),
  ('SEO', 'Marketing', false)
ON CONFLICT (name) DO NOTHING;

-- 3. Freelancer directory view (with aggregated stats)
CREATE OR REPLACE VIEW public.freelancer_directory
WITH (security_invoker=on) AS
SELECT
  p.id,
  p.username,
  p.full_name,
  p.nickname,
  p.avatar_url,
  p.bio,
  p.country,
  p.city,
  p.specialization,
  p.skills,
  p.hourly_rate,
  p.years_experience,
  p.availability,
  p.last_seen_at,
  p.created_at,
  COALESCE(r.avg_rating, 0)::numeric(3,2) AS avg_rating,
  COALESCE(r.reviews_count, 0) AS reviews_count,
  COALESCE(pr.completed_projects, 0) AS completed_projects
FROM public.profiles p
LEFT JOIN (
  SELECT to_user, AVG(rating)::numeric AS avg_rating, COUNT(*) AS reviews_count
  FROM public.reviews GROUP BY to_user
) r ON r.to_user = p.id
LEFT JOIN (
  SELECT freelancer_id, COUNT(*) AS completed_projects
  FROM public.projects
  WHERE status = 'completed' AND freelancer_id IS NOT NULL
  GROUP BY freelancer_id
) pr ON pr.freelancer_id = p.id
WHERE p.kind = 'freelancer' AND p.onboarded = true;

GRANT SELECT ON public.freelancer_directory TO anon, authenticated;

-- 4. Presence RPC
CREATE OR REPLACE FUNCTION public.update_presence()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.update_presence() TO authenticated;
