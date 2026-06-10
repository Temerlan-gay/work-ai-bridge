import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { BackButton } from "@/components/back-button";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  sendEmailVerificationCode,
  verifyEmailCode,
} from "@/lib/auth/email-code.functions";
import { getFriendlyAuthError } from "@/lib/auth-errors";

type PendingAuth =
  | {
      mode: "login";
      email: string;
      password: string;
    }
  | {
      mode: "register";
      email: string;
      password: string;
      fullName: string;
      avatar?: string | null;
    };

export const Route = createFileRoute("/verify-code")({
  head: () => ({ meta: [{ title: "Confirm code - WorkBridge" }] }),
  component: VerifyCodePage,
});

function readPendingAuth(): PendingAuth | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem("pendingAuth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAuth;
    if (!parsed.email || !parsed.password) return null;
    if (parsed.mode !== "login" && parsed.mode !== "register") return null;
    return parsed;
  } catch {
    return null;
  }
}

function VerifyCodePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [pending, setPending] = useState<PendingAuth | null>(null);
  const [checkedPending, setCheckedPending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    const nextPending = readPendingAuth();
    if (!nextPending) {
      navigate({ to: "/login", replace: true });
      return;
    }
    setPending(nextPending);
    setCheckedPending(true);
  }, [navigate]);

  const sendCode = async (auth: PendingAuth, successMessage: string) => {
    await sendEmailVerificationCode({ data: { email: auth.email } });
    setCode("");
    setSendStatus("sent");
    toast.success(successMessage);
  };

  useEffect(() => {
    if (!pending || sendStatus !== "idle") return;
    setSendStatus("sending");
    sendCode(pending, "We sent a 6-digit code to your email").catch((error: any) => {
      setSendStatus("error");
      if (error.message?.includes("RESEND_API_KEY")) {
        toast.error("Email sending is not configured. Add RESEND_API_KEY.");
      } else {
        toast.error(error.message ?? "Could not send the confirmation code");
      }
    });
  }, [pending, sendStatus]);

  const finishLogin = async (auth: Extract<PendingAuth, { mode: "login" }>) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: auth.email,
      password: auth.password,
    });

    if (error) {
      toast.error(getFriendlyAuthError(error));
      return;
    }
    if (!data.session) {
      toast.error("Could not sign in. Check your details and try again.");
      return;
    }

    sessionStorage.removeItem("pendingAuth");
    toast.success("You are signed in");
    navigate({ to: "/dashboard", replace: true });
  };

  const finishRegister = async (auth: Extract<PendingAuth, { mode: "register" }>) => {
    if (auth.avatar) {
      sessionStorage.setItem("pendingAvatar", auth.avatar);
    }

    const { data, error } = await supabase.auth.signUp({
      email: auth.email,
      password: auth.password,
      options: {
        data: { full_name: auth.fullName },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (error) {
      toast.error(getFriendlyAuthError(error));
      return;
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      toast.error(
        "Sorry, this account is already registered. Try signing in.",
      );
      return;
    }

    sessionStorage.removeItem("pendingAuth");
    if (data.session) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }

    toast.success("Account created. Now you can sign in.");
    navigate({ to: "/login", replace: true });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    setLoading(true);

    try {
      const verification = await verifyEmailCode({
        data: { email: pending.email, code },
      });

      if (!verification.ok) {
        const messages = {
          missing: "Request a confirmation code first.",
          expired: "The code has expired. Request a new code.",
          too_many_attempts: "Too many attempts. Request a new code.",
          invalid: "The code is incorrect. Check the 6 digits from 1 to 9 and try again.",
        };
        toast.error(messages[verification.reason]);
        return;
      }

      if (pending.mode === "login") {
        await finishLogin(pending);
      } else {
        await finishRegister(pending);
      }
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!pending) return;
    setResending(true);
    try {
      await sendCode(pending, "We sent a new code");
    } catch (error: any) {
      setSendStatus("error");
      if (error.message?.includes("RESEND_API_KEY")) {
        toast.error("Email sending is not configured. Add RESEND_API_KEY.");
      } else {
        toast.error(error.message ?? "Could not send a new code");
      }
    } finally {
      setResending(false);
    }
  };

  if (!checkedPending || !pending) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <BackButton />
      </div>
      <main className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Enter confirmation code</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {sendStatus === "sending"
              ? `Sending a 6-digit code to ${pending.email}`
              : sendStatus === "error"
                ? `Could not send the code to ${pending.email}. Try again.`
              : `We sent a 6-digit code to ${pending.email}`}
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">6-digit code</Label>
              <Input
                id="code"
                inputMode="numeric"
                pattern="[1-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/[^1-9]/g, "").slice(0, 6))
                }
                placeholder="123456"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              {loading ? "Checking..." : pending.mode === "login" ? "Sign in" : "Create account"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={loading || resending || sendStatus === "sending"}
              onClick={resend}
            >
              {resending || sendStatus === "sending" ? "Sending..." : "Send code again"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            Wrong email?{" "}
            <Link
              to={pending.mode === "login" ? "/login" : "/register"}
              className="text-primary hover:underline"
              onClick={() => sessionStorage.removeItem("pendingAuth")}
            >
              Go back
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
