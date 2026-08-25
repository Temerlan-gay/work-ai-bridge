import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { BackButton } from "@/components/back-button";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getFriendlyAuthError } from "@/lib/auth-errors";
import { signInWithGoogle } from "@/lib/supabase-oauth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in - WorkBridge" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        toast.error(getFriendlyAuthError(error));
        return;
      }
      if (!data.session) {
        toast.error("Could not sign in. Check your details and try again.");
        return;
      }

      toast.success("You are signed in");
      navigate({ to: "/dashboard", replace: true });
    } catch (cause) {
      toast.error(getFriendlyAuthError(cause));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle("/dashboard");
      if (error) toast.error(getFriendlyAuthError(error));
    } catch (cause) {
      toast.error(getFriendlyAuthError(cause));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <BackButton />
      </div>
      <main className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6">Log in to your WorkBridge account</p>

          <Button
            variant="outline"
            className="w-full mb-4"
            onClick={google}
            disabled={googleLoading || loading}
          >
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </Button>
          <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            New here?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
