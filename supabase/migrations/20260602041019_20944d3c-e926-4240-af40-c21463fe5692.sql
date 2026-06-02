
-- =========================================================
-- WorkBridge — Full schema
-- =========================================================

-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'freelancer', 'client');
CREATE TYPE public.user_kind AS ENUM ('freelancer', 'client');
CREATE TYPE public.project_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  nickname TEXT UNIQUE,
  avatar_url TEXT,
  kind public.user_kind NOT NULL DEFAULT 'freelancer',
  bio TEXT,
  country TEXT,
  city TEXT,
  age INTEGER,
  specialization TEXT,
  skills TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  hourly_rate NUMERIC(10,2),
  links JSONB DEFAULT '{}'::jsonb,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================================================
-- user_roles  (separate table, never on profile)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =========================================================
-- handle_new_user trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- portfolio_items
-- =========================================================
CREATE TABLE public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link TEXT,
  technologies TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.portfolio_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio items are public"
  ON public.portfolio_items FOR SELECT USING (true);
CREATE POLICY "Users manage own portfolio insert"
  ON public.portfolio_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own portfolio update"
  ON public.portfolio_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users manage own portfolio delete"
  ON public.portfolio_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================================
-- projects
-- =========================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  freelancer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  budget NUMERIC(10,2),
  deadline DATE,
  status public.project_status NOT NULL DEFAULT 'open',
  attachments TEXT[] DEFAULT '{}',
  skills_required TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects viewable by anyone"
  ON public.projects FOR SELECT USING (true);
CREATE POLICY "Clients create their own projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Client or assigned freelancer can update"
  ON public.projects FOR UPDATE TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = freelancer_id);
CREATE POLICY "Client can delete own project"
  ON public.projects FOR DELETE TO authenticated
  USING (auth.uid() = client_id);

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- proposals
-- =========================================================
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  delivery_days INTEGER NOT NULL DEFAULT 7,
  status public.proposal_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, freelancer_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owner or proposer can view"
  ON public.proposals FOR SELECT TO authenticated
  USING (
    auth.uid() = freelancer_id
    OR auth.uid() = (SELECT client_id FROM public.projects WHERE id = project_id)
  );
CREATE POLICY "Freelancers create own proposals"
  ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Freelancer or client can update proposal"
  ON public.proposals FOR UPDATE TO authenticated
  USING (
    auth.uid() = freelancer_id
    OR auth.uid() = (SELECT client_id FROM public.projects WHERE id = project_id)
  );

-- =========================================================
-- chats + messages
-- =========================================================
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b, project_id)
);

GRANT SELECT, INSERT ON public.chats TO authenticated;
GRANT ALL ON public.chats TO service_role;

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view chat"
  ON public.chats FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Participants can create chat"
  ON public.chats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT,
  image_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_id AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)
    )
  );
CREATE POLICY "Chat participants can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_id AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)
    )
  );
CREATE POLICY "Recipient can mark read"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_id AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =========================================================
-- reviews
-- =========================================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, from_user, to_user),
  CHECK (rating BETWEEN 1 AND 5)
);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are public"
  ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users create their own reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user);

-- =========================================================
-- notifications
-- =========================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================================
-- Storage buckets
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true),
       ('portfolio', 'portfolio', true),
       ('projects', 'projects', true),
       ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (avatars / portfolio / projects / chat-images): public read, authenticated write to own folder ({user_id}/...)
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Auth update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Auth delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read portfolio"
  ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
CREATE POLICY "Auth upload portfolio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Auth delete portfolio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read projects"
  ON storage.objects FOR SELECT USING (bucket_id = 'projects');
CREATE POLICY "Auth upload projects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'projects' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read chat-images"
  ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');
CREATE POLICY "Auth upload chat-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);
