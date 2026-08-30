import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { BackButton } from "@/components/back-button";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getFriendlyAuthError } from "@/lib/auth-errors";
import { CATEGORIES, SPECIALIZATIONS } from "@/lib/categories";
import { signInWithGoogle } from "@/lib/supabase-oauth";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Регистрация - TalentBridge" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [talentCategory, setTalentCategory] = useState<string>("Футбол");
  const [specialization, setSpecialization] = useState<string>("Футболист");
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

  const saveAvatarForUpload = async () => {
    if (!avatarFile) return;
    const pendingAvatar = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(avatarFile);
    });
    if (pendingAvatar) sessionStorage.setItem("pendingAvatar", pendingAvatar);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) {
      toast.error("Заполните имя и фамилию.");
      return;
    }
    if (!talentCategory.trim()) {
      toast.error("Выберите сферу таланта.");
      return;
    }
    if (!specialization.trim()) {
      toast.error("Выберите роль или профессию.");
      return;
    }
    if (!email.trim()) {
      toast.error("Введите email.");
      return;
    }
    if (password.length < 6) {
      toast.error("Пароль должен быть минимум 6 символов.");
      return;
    }
    setLoading(true);

    try {
      await saveAvatarForUpload();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim(), talent_category: talentCategory, specialization },
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });

      if (error) {
        toast.error(getFriendlyAuthError(error));
        return;
      }

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast.error("Sorry, this account is already registered. Try signing in.");
        return;
      }

      if (data.session) {
        navigate({ to: "/onboarding", replace: true });
        return;
      }

      toast.success("Account created. Now you can sign in.");
      navigate({ to: "/login", replace: true });
    } catch (cause) {
      toast.error(getFriendlyAuthError(cause));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle("/onboarding");
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
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Создать профиль</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Расскажите, в какой сфере у вас талант, чтобы наставники и проекты могли вас найти.
          </p>

          <Button
            variant="outline"
            className="w-full mb-4"
            onClick={google}
            disabled={googleLoading || loading}
          >
            {googleLoading ? "Переходим..." : "Продолжить с Google"}
          </Button>
          <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> или <div className="h-px flex-1 bg-border" />
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
              <span className="text-xs text-muted-foreground">Фото профиля (необязательно)</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName">Имя и фамилия</Label>
              <Input
                id="fullName"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Сфера таланта</Label>
                <Select value={talentCategory} onValueChange={setTalentCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Роль / профессия</Label>
                <Select value={specialization} onValueChange={setSpecialization}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <Label htmlFor="password">Пароль</Label>
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
              {loading ? "Создаем..." : "Зарегистрироваться"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
