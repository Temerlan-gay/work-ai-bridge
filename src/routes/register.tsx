import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";

import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import {
  sendEmailVerificationCode,
  verifyEmailCode,
} from "@/lib/auth/email-code.functions";
import { getFriendlyAuthError } from "@/lib/auth-errors";
import { signInWithGoogle } from "@/lib/supabase-oauth";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Sign up - WorkBridge" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const pending = sessionStorage.getItem("pendingAvatar");
      if (pending) {
        try {
          const res = await fetch(pending);
          const blob = await res.blob();
          const path = `${user.id}/avatar-${Date.now()}.${blob.type.split("/")[1] || "png"}`;
          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(path, blob);
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
            await supabase
              .from("profiles")
              .update({ avatar_url: urlData.publicUrl })
              .eq("id", user.id);
          }
        } catch {
          // Avatar upload is best-effort; registration should still finish.
        }
        sessionStorage.removeItem("pendingAvatar");
      }
      navigate({ to: "/onboarding", replace: true });
    })();
  }, [user, navigate]);

  const onPickAvatar = (file: File | null) => {
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const sendCode = async (targetEmail: string) => {
    try {
      await sendEmailVerificationCode({ data: { email: targetEmail } });
      setVerifiedEmail(targetEmail);
      setCodeSent(true);
      setVerificationCode("");
      toast.success("Мы отправили 6-значный код на вашу почту");
    } catch (error: any) {
      if (error.message?.includes("ACCOUNT_ALREADY_REGISTERED")) {
        toast.error("Простите, но этот аккаунт уже зарегистрирован. Попробуйте войти.");
      } else if (error.message?.includes("RESEND_API_KEY")) {
        toast.error("Отправка писем еще не настроена. Добавьте RESEND_API_KEY.");
      } else {
        toast.error(error.message ?? "Не удалось отправить код подтверждения");
      }
    }
  };

  const createAccount = async (targetEmail: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: targetEmail,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (error) {
      toast.error(getFriendlyAuthError(error));
      return;
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      toast.error("Простите, но этот аккаунт уже зарегистрирован. Попробуйте войти.");
      return;
    }

    if (avatarFile) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          sessionStorage.setItem("pendingAvatar", reader.result);
        }
      };
      reader.readAsDataURL(avatarFile);
    }

    if (data.session) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }

    toast.success("Аккаунт создан. Теперь можно войти.");
    navigate({ to: "/login", replace: true });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const cleanedEmail = email.trim().toLowerCase();
      if (!codeSent || verifiedEmail !== cleanedEmail) {
        await sendCode(cleanedEmail);
        return;
      }

      const verification = await verifyEmailCode({
        data: { email: cleanedEmail, code: verificationCode },
      });

      if (!verification.ok) {
        const messages = {
          missing: "Сначала запросите код подтверждения.",
          expired: "Код устарел. Запросите новый код.",
          too_many_attempts: "Слишком много попыток. Запросите новый код.",
          invalid: "Код неверный. Проверьте 6 цифр и попробуйте еще раз.",
        };
        toast.error(messages[verification.reason]);
        return;
      }

      await createAccount(cleanedEmail);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle("/onboarding");
    setGoogleLoading(false);
    if (error) toast.error(getFriendlyAuthError(error));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <BackButton />
      </div>
      <main className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Create an account</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Join WorkBridge as a freelancer or a client
          </p>

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
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative size-20 rounded-full border-2 border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden hover:bg-muted transition"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="size-6 text-muted-foreground" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => onPickAvatar(event.target.files?.[0] ?? null)}
              />
              <span className="text-xs text-muted-foreground">Upload profile photo (optional)</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                required
                value={fullName}
                disabled={codeSent}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                disabled={codeSent}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                disabled={codeSent}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {codeSent && (
              <div className="space-y-1.5">
                <Label htmlFor="verificationCode">6-digit confirmation code</Label>
                <Input
                  id="verificationCode"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                />
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Check your inbox for the code.</span>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      setCodeSent(false);
                      setVerifiedEmail("");
                    }}
                  >
                    Change email
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : codeSent ? "Confirm & create account" : "Send code"}
            </Button>

            {codeSent && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={loading}
                onClick={() => sendCode(verifiedEmail)}
              >
                Send code again
              </Button>
            )}
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
