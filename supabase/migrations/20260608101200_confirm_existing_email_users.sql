-- Confirmation was disabled for this project so email/password signups can log in immediately.
-- Backfill existing users created while confirmation was still required.
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email IS NOT NULL
  AND email_confirmed_at IS NULL;
