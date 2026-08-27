ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS boosted_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_gender_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_check
  CHECK (gender IS NULL OR gender IN ('boy', 'girl', 'other'));
CREATE INDEX IF NOT EXISTS profiles_boosted_at_idx ON public.profiles (boosted_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.workcoin_prices (
  key text PRIMARY KEY,
  cost integer NOT NULL CHECK (cost > 0),
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.workcoin_prices (key, cost, description)
VALUES
  ('boost_profile', 250, 'Поднять профиль подростка в каталоге на 7 дней'),
  ('boost_project', 250, 'Поднять возможность в каталоге на 7 дней'),
  ('boost_portfolio', 250, 'Поднять работу или достижение в портфолио на 7 дней')
ON CONFLICT (key) DO UPDATE
SET cost = EXCLUDED.cost,
    description = EXCLUDED.description,
    updated_at = now();

GRANT SELECT ON public.workcoin_prices TO anon, authenticated;
GRANT ALL ON public.workcoin_prices TO service_role;

ALTER TABLE public.workcoin_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workcoin_prices readable by all" ON public.workcoin_prices;
CREATE POLICY "workcoin_prices readable by all"
  ON public.workcoin_prices FOR SELECT
  USING (true);

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
  p.age,
  p.gender,
  p.specialization,
  p.skills,
  p.hourly_rate,
  p.years_experience,
  p.availability,
  p.last_seen_at,
  p.boosted_at,
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

CREATE OR REPLACE FUNCTION public.boost_item(p_kind text, p_id uuid)
RETURNS TABLE(success boolean, message text, balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_cost int;
  v_balance int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'Нужно войти в аккаунт'::text, 0; RETURN;
  END IF;

  IF p_kind = 'project' THEN
    SELECT client_id INTO v_owner FROM public.projects WHERE id = p_id;
  ELSIF p_kind = 'portfolio' THEN
    SELECT user_id INTO v_owner FROM public.portfolio_items WHERE id = p_id;
  ELSIF p_kind = 'profile' THEN
    SELECT id INTO v_owner FROM public.profiles WHERE id = p_id;
  ELSE
    RETURN QUERY SELECT false, 'Неизвестный тип продвижения'::text, 0; RETURN;
  END IF;

  SELECT cost INTO v_cost FROM public.workcoin_prices WHERE key = 'boost_' || p_kind;
  v_cost := COALESCE(v_cost, 250);

  IF v_owner IS NULL THEN
    RETURN QUERY SELECT false, 'Профиль или запись не найдены'::text, 0; RETURN;
  END IF;

  IF v_owner <> v_uid THEN
    RETURN QUERY SELECT false, 'Можно продвигать только свой профиль или свою запись'::text, 0; RETURN;
  END IF;

  SELECT balance INTO v_balance FROM public.workcoin_wallets WHERE user_id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_cost THEN
    RETURN QUERY SELECT false, 'Недостаточно WorkCoins'::text, COALESCE(v_balance, 0); RETURN;
  END IF;

  UPDATE public.workcoin_wallets SET balance = balance - v_cost WHERE user_id = v_uid;

  INSERT INTO public.workcoin_transactions (user_id, amount, reason, project_id)
  VALUES (v_uid, -v_cost, 'boost_' || p_kind, CASE WHEN p_kind = 'project' THEN p_id ELSE NULL END);

  IF p_kind = 'project' THEN
    UPDATE public.projects SET boosted_at = now() WHERE id = p_id;
  ELSIF p_kind = 'portfolio' THEN
    UPDATE public.portfolio_items SET boosted_at = now() WHERE id = p_id;
  ELSE
    UPDATE public.profiles SET boosted_at = now() WHERE id = p_id;
  END IF;

  RETURN QUERY SELECT true, 'Поднято в топ на 7 дней'::text, (v_balance - v_cost);
END
$$;

GRANT EXECUTE ON FUNCTION public.boost_item(text, uuid) TO authenticated;
