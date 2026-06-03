CREATE OR REPLACE FUNCTION public.get_my_chat_streaks()
RETURNS TABLE(chat_id uuid, streak integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_chats AS (
    SELECT c.id
    FROM public.chats c
    WHERE c.user_a = auth.uid() OR c.user_b = auth.uid()
  ),
  days AS (
    SELECT m.chat_id, m.sender_id, (m.created_at AT TIME ZONE 'UTC')::date AS d
    FROM public.messages m
    JOIN my_chats mc ON mc.id = m.chat_id
    GROUP BY m.chat_id, m.sender_id, (m.created_at AT TIME ZONE 'UTC')::date
  ),
  both_days AS (
    SELECT chat_id, d
    FROM days
    GROUP BY chat_id, d
    HAVING COUNT(DISTINCT sender_id) >= 2
  ),
  grouped AS (
    SELECT
      chat_id,
      d,
      d - (ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY d))::int AS grp
    FROM both_days
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
  SELECT chat_id, len
  FROM latest
  WHERE last_d >= (CURRENT_DATE - INTERVAL '1 day');
$$;

GRANT EXECUTE ON FUNCTION public.get_my_chat_streaks() TO authenticated;