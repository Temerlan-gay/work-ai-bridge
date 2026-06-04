
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS boosted_at timestamptz;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS boosted_at timestamptz;
CREATE INDEX IF NOT EXISTS projects_boosted_at_idx ON public.projects (boosted_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS portfolio_items_boosted_at_idx ON public.portfolio_items (boosted_at DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.boost_item(p_kind text, p_id uuid)
RETURNS TABLE(success boolean, message text, balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_cost int := 250;
  v_balance int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'Не авторизован'::text, 0; RETURN;
  END IF;

  IF p_kind = 'project' THEN
    SELECT client_id INTO v_owner FROM public.projects WHERE id = p_id;
  ELSIF p_kind = 'portfolio' THEN
    SELECT user_id INTO v_owner FROM public.portfolio_items WHERE id = p_id;
  ELSE
    RETURN QUERY SELECT false, 'Неизвестный тип'::text, 0; RETURN;
  END IF;

  IF v_owner IS NULL THEN
    RETURN QUERY SELECT false, 'Не найдено'::text, 0; RETURN;
  END IF;

  IF v_owner <> v_uid THEN
    RETURN QUERY SELECT false, 'Можно бустить только своё'::text, 0; RETURN;
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
  ELSE
    UPDATE public.portfolio_items SET boosted_at = now() WHERE id = p_id;
  END IF;

  RETURN QUERY SELECT true, 'Поднято в топ'::text, (v_balance - v_cost);
END
$$;

GRANT EXECUTE ON FUNCTION public.boost_item(text, uuid) TO authenticated;
