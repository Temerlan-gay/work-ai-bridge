import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { BackButton } from "@/components/back-button";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { sendEmailVerificationCode } from "@/lib/auth/email-code.functions";
import { getFriendlyAuthError } from "@/lib/auth-errors";
import { signInWithGoogle } from "@/lib/supabase-oauth";

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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const cleanedEmail = email.trim().toLowerCase();
      let pendingAvatar: string | null = null;

      if (avatarFile) {
        pendingAvatar = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(avatarFile);
        });
      }

      await sendEmailVerificationCode({ data: { email: cleanedEmail } });
      sessionStorage.setItem(
        "pendingAuth",
        JSON.stringify({
          mode: "register",
          email: cleanedEmail,
          password,
          fullName,
          avatar: pendingAvatar,
        }),
      );
      toast.success("We sent a 6-digit code to your email");
      navigate({ to: "/verify-code", replace: true });
    } catch (error: any) {
      if (error.message?.includes("RESEND_API_KEY")) {
        toast.error("Email sending is not configured. Add RESEND_API_KEY.");
      } else {
        toast.error(getFriendlyAuthError(error));
      }
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
            Fill in your details, then confirm the code from your email
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
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending code..." : "Sign up"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
