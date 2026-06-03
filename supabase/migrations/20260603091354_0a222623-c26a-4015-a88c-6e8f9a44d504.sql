
-- 1) Wallets
CREATE TABLE public.workcoin_wallets (
  user_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.workcoin_wallets TO authenticated;
GRANT ALL ON public.workcoin_wallets TO service_role;

ALTER TABLE public.workcoin_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet"
  ON public.workcoin_wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER workcoin_wallets_updated_at
  BEFORE UPDATE ON public.workcoin_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Transactions (audit log)
CREATE TABLE public.workcoin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX workcoin_tx_unique_reason_project
  ON public.workcoin_transactions (user_id, reason, project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX workcoin_tx_user_idx ON public.workcoin_transactions (user_id, created_at DESC);

GRANT SELECT ON public.workcoin_transactions TO authenticated;
GRANT ALL ON public.workcoin_transactions TO service_role;

ALTER TABLE public.workcoin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions"
  ON public.workcoin_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3) Core award function (SECURITY DEFINER bypasses RLS for trusted triggers)
CREATE OR REPLACE FUNCTION public.award_workcoins(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_project_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted uuid;
BEGIN
  IF p_user_id IS NULL OR p_amount = 0 THEN RETURN; END IF;

  INSERT INTO public.workcoin_transactions (user_id, amount, reason, project_id)
  VALUES (p_user_id, p_amount, p_reason, p_project_id)
  ON CONFLICT (user_id, reason, project_id) WHERE project_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_inserted IS NULL THEN RETURN; END IF;

  INSERT INTO public.workcoin_wallets (user_id, balance)
  VALUES (p_user_id, GREATEST(0, p_amount))
  ON CONFLICT (user_id) DO UPDATE
    SET balance = GREATEST(0, public.workcoin_wallets.balance + p_amount);
END
$$;

-- 4) Auto-create wallet on profile insert
CREATE OR REPLACE FUNCTION public.create_workcoin_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workcoin_wallets (user_id) VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END
$$;

CREATE TRIGGER create_wallet_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_workcoin_wallet();

-- Backfill wallets for existing profiles
INSERT INTO public.workcoin_wallets (user_id)
SELECT id FROM public.profiles
ON CONFLICT DO NOTHING;

-- 5) Award on project insert (client posts project)
CREATE OR REPLACE FUNCTION public.award_on_project_posted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_workcoins(NEW.client_id, 50, 'project_posted', NEW.id);
  RETURN NEW;
END
$$;

CREATE TRIGGER award_project_posted
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.award_on_project_posted();

-- 6) Award on project completion (freelancer delivered)
CREATE OR REPLACE FUNCTION public.award_on_project_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status::text = 'completed'
     AND (OLD.status::text IS DISTINCT FROM 'completed')
     AND NEW.freelancer_id IS NOT NULL THEN
    PERFORM public.award_workcoins(NEW.freelancer_id, 50, 'project_completed', NEW.id);
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER award_project_completed
  AFTER UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.award_on_project_completed();
