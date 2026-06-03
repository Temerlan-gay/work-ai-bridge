-- notifications: explicit service-role-only insert, revoke insert from authenticated
REVOKE INSERT ON public.notifications FROM authenticated;
CREATE POLICY "service role inserts notifications"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- streak_restorations: require user is participant of chat
DROP POLICY IF EXISTS "users insert own restorations" ON public.streak_restorations;
CREATE POLICY "users insert own restorations"
  ON public.streak_restorations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = streak_restorations.chat_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- workcoin_transactions: explicit service-role-only writes
CREATE POLICY "service role inserts workcoin_transactions"
  ON public.workcoin_transactions FOR INSERT
  TO service_role WITH CHECK (true);
CREATE POLICY "service role updates workcoin_transactions"
  ON public.workcoin_transactions FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role deletes workcoin_transactions"
  ON public.workcoin_transactions FOR DELETE
  TO service_role USING (true);

-- workcoin_wallets: explicit service-role-only writes
CREATE POLICY "service role inserts workcoin_wallets"
  ON public.workcoin_wallets FOR INSERT
  TO service_role WITH CHECK (true);
CREATE POLICY "service role updates workcoin_wallets"
  ON public.workcoin_wallets FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role deletes workcoin_wallets"
  ON public.workcoin_wallets FOR DELETE
  TO service_role USING (true);