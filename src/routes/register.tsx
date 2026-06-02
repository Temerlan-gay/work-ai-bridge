import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Camera } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Sign up — WorkBridge" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"form" | "sent">("form");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const pending = sessionStorage.getItem("pendingAvatar");
      if (pending) {
        try {
          const res = await fetch(pending);
          const blob = await res.blob();
          const path = `${user.id}/avatar-${Date.now()}.${blob.type.split("/")[1] || "png"}`;
          const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob);
          if (!upErr) {
            const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
            await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
          }
        } catch {}
        sessionStorage.removeItem("pendingAvatar");
      }
      navigate({ to: "/onboarding", replace: true });
    })();
  }, [user, navigate]);

  const onPickAvatar = (f: File | null) => {
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: { full_name: fullName },
        },
      });
      if (error) {
        toast.error(error.message);
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
      toast.success("Confirmation email sent");
      setStep("sent");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/onboarding` },
      });
      if (error) toast.error(error.message);
      else toast.success("Confirmation email resent");
    } finally {
      setResending(false);
    }
  };

  const google = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/onboarding" });
    if (res.error) toast.error(res.error.message);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Create an account</h1>
          <p className="text-sm text-muted-foreground mb-6">Join WorkBridge as a freelancer or a client</p>
          <Button variant="outline" className="w-full mb-4" onClick={google}>Continue with Google</Button>
          <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
          {step === "form" ? (
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
                onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
              />
              <span className="text-xs text-muted-foreground">Upload profile photo (optional)</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
          </form>
          ) : (
          <div className="space-y-4 text-center">
            <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">📧</div>
            <h2 className="text-lg font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
              Click the link in the email to confirm your account — you'll be signed in automatically.
            </p>
            <div className="flex justify-between text-sm pt-2">
              <button type="button" onClick={() => setStep("form")} className="text-muted-foreground hover:underline">Back</button>
              <button type="button" onClick={resend} disabled={resending} className="text-primary hover:underline disabled:opacity-50">
                {resending ? "Sending..." : "Resend email"}
              </button>
            </div>
          </div>
          )}
          <p className="mt-6 text-sm text-muted-foreground text-center">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}