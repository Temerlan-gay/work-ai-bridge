DROP FUNCTION IF EXISTS public.get_my_chat_streaks();

CREATE TABLE public.streak_restorations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chat_id uuid NOT NULL,
  restored_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chat_id, restored_date)
);

GRANT SELECT, INSERT ON public.streak_restorations TO authenticated;
GRANT ALL ON public.streak_restorations TO service_role;

ALTER TABLE public.streak_restorations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants view restorations"
ON public.streak_restorations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = streak_restorations.chat_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
);

CREATE POLICY "users insert own restorations"
ON public.streak_restorations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_streak_restorations_chat ON public.streak_restorations(chat_id);
CREATE INDEX idx_streak_restorations_user_month ON public.streak_restorations(user_id, created_at);

CREATE FUNCTION public.get_my_chat_streaks()
RETURNS TABLE(chat_id uuid, streak integer, can_restore boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH my_chats AS (
    SELECT c.id
    FROM public.chats c
    WHERE c.user_a = auth.uid() OR c.user_b = auth.uid()
  ),
  real_days AS (
    SELECT m.chat_id, m.sender_id, (m.created_at AT TIME ZONE 'UTC')::date AS d
    FROM public.messages m
    JOIN my_chats mc ON mc.id = m.chat_id
    GROUP BY m.chat_id, m.sender_id, (m.created_at AT TIME ZONE 'UTC')::date
  ),
  both_real AS (
    SELECT chat_id, d
    FROM real_days
    GROUP BY chat_id, d
    HAVING COUNT(DISTINCT sender_id) >= 2
  ),
  combined AS (
    SELECT chat_id, d FROM both_real
    UNION
    SELECT sr.chat_id, sr.restored_date AS d
    FROM public.streak_restorations sr
    JOIN my_chats mc ON mc.id = sr.chat_id
  ),
  grouped AS (
    SELECT
      chat_id,
      d,
      d - (ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY d))::int AS grp
    FROM combined
  ),
  runs AS (
    SELECT chat_id, MAX(d) AS last_d, COUNT(*)::int AS len
    FROM grouped
    GROUP BY chat_id, grp
  ),
  latest AS (
    SELECT DISTINCT ON (chat_id) chat_id, last_d, len
    FROM runs
    ORDER BY chat_id, last_d DESC
  )
  SELECT
    l.chat_id,
    CASE
      WHEN l.last_d >= CURRENT_DATE - 1 AND l.len >= 3 THEN l.len
      ELSE 0
    END AS streak,
    (l.last_d < CURRENT_DATE - 1 AND l.len >= 3 AND l.last_d >= CURRENT_DATE - 30) AS can_restore
  FROM latest l;
$$;

CREATE OR REPLACE FUNCTION public.get_streak_restores_left()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT GREATEST(0, 3 - COALESCE((
    SELECT COUNT(DISTINCT created_at::date)
    FROM public.streak_restorations
    WHERE user_id = auth.uid()
      AND created_at >= date_trunc('month', now())
  ), 0))::int;
$$;

CREATE OR REPLACE FUNCTION public.restore_streak(p_chat_id uuid)
RETURNS TABLE(success boolean, message text, restores_left integer)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_left int;
  v_last_d date;
  v_today date := CURRENT_DATE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'Не авторизован'::text, 0; RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = p_chat_id AND (c.user_a = v_uid OR c.user_b = v_uid)
  ) THEN
    RETURN QUERY SELECT false, 'Нет доступа к чату'::text, 0; RETURN;
  END IF;

  SELECT GREATEST(0, 3 - COUNT(DISTINCT created_at::date))::int
  INTO v_left
  FROM public.streak_restorations
  WHERE user_id = v_uid AND created_at >= date_trunc('month', now());

  IF v_left <= 0 THEN
    RETURN QUERY SELECT false, 'Восстановления закончились — новые появятся в начале следующего месяца'::text, 0; RETURN;
  END IF;

  WITH real_days AS (
    SELECT m.sender_id, (m.created_at AT TIME ZONE 'UTC')::date AS d
    FROM public.messages m
    WHERE m.chat_id = p_chat_id
    GROUP BY m.sender_id, (m.created_at AT TIME ZONE 'UTC')::date
  ),
  both_real AS (
    SELECT d FROM real_days GROUP BY d HAVING COUNT(DISTINCT sender_id) >= 2
  ),
  combined AS (
    SELECT d FROM both_real
    UNION
    SELECT restored_date AS d FROM public.streak_restorations WHERE chat_id = p_chat_id
  )
  SELECT MAX(d) INTO v_last_d FROM combined;

  IF v_last_d IS NULL OR v_last_d >= v_today - 1 THEN
    RETURN QUERY SELECT false, 'Стрик не сломан'::text, v_left; RETURN;
  END IF;

  INSERT INTO public.streak_restorations (user_id, chat_id, restored_date)
  SELECT v_uid, p_chat_id, gs::date
  FROM generate_series(v_last_d + 1, v_today - 1, '1 day'::interval) AS gs
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT true, 'Стрик восстановлен'::text, (v_left - 1);
END
$$;