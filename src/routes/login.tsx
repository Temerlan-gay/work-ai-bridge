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
  head: () => ({ meta: [{ title: "Вход - TalentBridge" }] }),
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
        toast.error("Не удалось войти. Проверьте данные и попробуйте снова.");
        return;
      }

      toast.success("Вы вошли в аккаунт");
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
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">С возвращением</h1>
          <p className="mb-6 text-sm text-muted-foreground">Войдите в аккаунт TalentBridge</p>

          <Button
            variant="outline"
            className="mb-4 w-full"
            onClick={google}
            disabled={googleLoading || loading}
          >
            {googleLoading ? "Переходим..." : "Продолжить с Google"}
          </Button>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> или <div className="h-px flex-1 bg-border" />
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
                <Label htmlFor="password">Пароль</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Забыли?
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
              {loading ? "Входим..." : "Войти"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Еще нет аккаунта?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Создать профиль
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
