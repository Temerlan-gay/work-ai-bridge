CREATE TABLE public.ai_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature text NOT NULL,
  action text NOT NULL,
  input_summary text,
  output_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_confirmation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature text NOT NULL,
  target_table text,
  target_id text,
  original_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision text NOT NULL CHECK (decision IN ('accepted', 'rejected', 'manual_edit')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_id uuid REFERENCES public.ai_confirmation_history(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature text NOT NULL,
  target_table text,
  target_id text,
  before_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_confirmation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own AI action logs"
  ON public.ai_action_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI action logs"
  ON public.ai_action_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own AI confirmations"
  ON public.ai_confirmation_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI confirmations"
  ON public.ai_confirmation_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own AI audit trail"
  ON public.ai_audit_trail FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI audit trail"
  ON public.ai_audit_trail FOR INSERT
  WITH CHECK (auth.uid() = user_id);
