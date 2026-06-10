CREATE OR REPLACE FUNCTION public.request_email_verification_code(
  p_email text,
  p_code_hash text,
  p_expires_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.email_verification_codes
  SET consumed_at = now()
  WHERE email = lower(trim(p_email))
    AND consumed_at IS NULL;

  INSERT INTO public.email_verification_codes (email, code_hash, expires_at)
  VALUES (lower(trim(p_email)), p_code_hash, p_expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_email_verification_code(
  p_email text,
  p_code_hash text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.email_verification_codes%ROWTYPE;
BEGIN
  SELECT *
  INTO v_row
  FROM public.email_verification_codes
  WHERE email = lower(trim(p_email))
    AND consumed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;

  IF v_row.expires_at < now() THEN
    UPDATE public.email_verification_codes
    SET consumed_at = now()
    WHERE id = v_row.id;
    RETURN 'expired';
  END IF;

  IF v_row.attempts >= 5 THEN
    RETURN 'too_many_attempts';
  END IF;

  IF v_row.code_hash <> p_code_hash THEN
    UPDATE public.email_verification_codes
    SET attempts = attempts + 1
    WHERE id = v_row.id;
    RETURN 'invalid';
  END IF;

  UPDATE public.email_verification_codes
  SET consumed_at = now()
  WHERE id = v_row.id;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.request_email_verification_code(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_email_verification_code(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.request_email_verification_code(text, text, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_email_verification_code(text, text) TO anon, authenticated;
