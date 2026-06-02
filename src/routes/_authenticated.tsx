import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  const emailConfirmed = !!user.email_confirmed_at || !!(user as { confirmed_at?: string }).confirmed_at;
  if (!emailConfirmed) {
    const resend = async () => {
      if (!user.email) return;
      setResending(true);
      const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
      setResending(false);
      if (error) toast.error(error.message);
      else toast.success("Confirmation email sent");
    };
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm text-center animate-fade-in">
            <div className="mx-auto mb-4 size-14 rounded-full bg-primary/10 flex items-center justify-center">
              <MailCheck className="size-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Confirm your email</h1>
            <p className="text-sm text-muted-foreground mb-6">
              We sent a confirmation link to <span className="text-foreground font-medium">{user.email}</span>.
              Click it to activate your account and start using WorkBridge.
            </p>
            <Button onClick={resend} disabled={resending} className="w-full mb-3">
              {resending ? "Sending…" : "Resend confirmation email"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login", replace: true }); }}>
              Sign out
            </Button>
            <p className="mt-6 text-xs text-muted-foreground">
              Wrong address? <Link to="/register" className="text-primary hover:underline">Register again</Link>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return <Outlet />;
}