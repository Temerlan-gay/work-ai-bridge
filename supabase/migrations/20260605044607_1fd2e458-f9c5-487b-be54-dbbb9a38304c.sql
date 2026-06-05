REVOKE INSERT ON public.notifications FROM authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_workcoin_wallet() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_workcoins(uuid, integer, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_on_project_posted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_on_project_completed() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.boost_item(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.boost_item(text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.restore_streak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_streak(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_chat_streaks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_chat_streaks() TO authenticated;

REVOKE ALL ON FUNCTION public.get_streak_restores_left() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_streak_restores_left() TO authenticated;

REVOKE ALL ON FUNCTION public.update_presence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_presence() TO authenticated;