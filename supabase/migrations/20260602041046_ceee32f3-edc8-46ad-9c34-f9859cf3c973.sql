
-- Fix function search_path
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Restrict SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Drop broad public-listing SELECT policies on storage.objects.
-- Public buckets still serve files via URL without needing a SELECT policy.
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Public read projects" ON storage.objects;
DROP POLICY IF EXISTS "Public read chat-images" ON storage.objects;
