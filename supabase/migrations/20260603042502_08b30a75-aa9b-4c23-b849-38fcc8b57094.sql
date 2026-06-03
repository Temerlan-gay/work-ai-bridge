
-- Enable realtime for messages
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Storage policies for chat-images bucket
DROP POLICY IF EXISTS "chat-images public read" ON storage.objects;
CREATE POLICY "chat-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "chat-images authenticated upload" ON storage.objects;
CREATE POLICY "chat-images authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "chat-images owner delete" ON storage.objects;
CREATE POLICY "chat-images owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);
