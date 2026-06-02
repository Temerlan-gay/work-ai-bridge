CREATE TABLE public.email_verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evc_email ON public.email_verification_codes (email, created_at DESC);

GRANT ALL ON public.email_verification_codes TO service_role;

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
  ON public.email_verification_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
