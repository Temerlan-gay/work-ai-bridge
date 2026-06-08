import { supabase } from "@/integrations/supabase/client";

export const signInWithGoogle = async (redirectPath: "/dashboard" | "/onboarding") => {
  const redirectTo = `${window.location.origin}${redirectPath}`;

  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });
};
