
-- 1. Restrict profiles SELECT to authenticated users
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2. Realtime authorization: restrict messages broadcast to chat participants
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants can receive realtime messages" ON realtime.messages;
CREATE POLICY "Chat participants can receive realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id::text = realtime.topic()
      AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)
  )
);

-- 3. chat-images storage policies (DELETE + SELECT scoped)
DROP POLICY IF EXISTS "Chat image uploader can delete" ON storage.objects;
CREATE POLICY "Chat image uploader can delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. projects bucket - UPDATE and DELETE for uploader
DROP POLICY IF EXISTS "Project uploader can update" ON storage.objects;
CREATE POLICY "Project uploader can update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'projects'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Project uploader can delete" ON storage.objects;
CREATE POLICY "Project uploader can delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'projects'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
