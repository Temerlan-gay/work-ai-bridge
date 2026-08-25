import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_e, s) => {
        setSession(s);
        setLoading(false);
      });
      unsubscribe = () => subscription.unsubscribe();

      supabase.auth
        .getSession()
        .then(({ data, error: sessionError }) => {
          if (sessionError) setError(sessionError);
          setSession(data.session);
        })
        .catch((cause: unknown) => {
          const authError = cause instanceof Error ? cause : new Error(String(cause));
          console.error("[Auth] Unable to restore session", authError);
          setError(authError);
        })
        .finally(() => setLoading(false));
    } catch (cause) {
      const authError = cause instanceof Error ? cause : new Error(String(cause));
      console.error("[Auth] Unable to initialize Supabase", authError);
      setError(authError);
      setLoading(false);
    }

    return () => unsubscribe?.();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, loading, error, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
