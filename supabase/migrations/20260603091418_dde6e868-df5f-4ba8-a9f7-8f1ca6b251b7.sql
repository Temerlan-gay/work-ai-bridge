
REVOKE EXECUTE ON FUNCTION public.award_workcoins(uuid, integer, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_workcoin_wallet() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_on_project_posted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_on_project_completed() FROM PUBLIC, anon, authenticated;
