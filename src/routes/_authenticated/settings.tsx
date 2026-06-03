import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Настройки — WorkBridge" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [initialNickname, setInitialNickname] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [savingNick, setSavingNick] = useState(false);

  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setCurrentEmail(user.email ?? "");
    supabase
      .from("profiles")
      .select("nickname, username, avatar_url, full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setNickname(data?.nickname ?? "");
        setUsername(data?.username ?? "");
        setInitialNickname(data?.nickname ?? "");
        setInitialUsername(data?.username ?? "");
        setAvatarUrl(data?.avatar_url ?? null);
        setFullName(data?.full_name ?? "");
      });
  }, [user]);

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Можно загружать только изображения");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Размер файла не должен превышать 5 МБ");
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploadingAvatar(false);
      toast.error(upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);
    setUploadingAvatar(false);
    if (updErr) {
      toast.error(updErr.message);
      return;
    }
    setAvatarUrl(publicUrl);
    toast.success("Фото профиля обновлено");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAvatar = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAvatarUrl(null);
    toast.success("Фото удалено");
  };

  const saveNickname = async () => {
    if (!user) return;
    setSavingNick(true);
    const cleanedUsername = username
      ? username.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "")
      : null;
    if (cleanedUsername && cleanedUsername.length < 3) {
      toast.error("Username должен содержать минимум 3 символа");
      setSavingNick(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ nickname: nickname || null, username: cleanedUsername })
      .eq("id", user.id);
    setSavingNick(false);
    if (error) {
      if (error.code === "23505") toast.error("Этот username уже занят");
      else toast.error(error.message);
      return;
    }
    setInitialNickname(nickname);
    setInitialUsername(cleanedUsername ?? "");
    toast.success("Профиль обновлён");
  };

  const changeEmail = async () => {
    if (!newEmail || newEmail === currentEmail) {
      toast.error("Введите новый email");
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSavingEmail(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      "Письмо для подтверждения отправлено на новый email. Перейдите по ссылке, чтобы завершить смену."
    );
    setNewEmail("");
  };

  const nickDirty = nickname !== initialNickname || username !== initialUsername;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
          <p className="text-sm text-muted-foreground">
            Управляйте никнеймом и привязанной почтой.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Фото профиля</CardTitle>
            <CardDescription>Загрузите аватар (JPG, PNG, WebP — до 5 МБ).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="size-20">
                <AvatarImage src={avatarUrl ?? undefined} alt={fullName || "avatar"} />
                <AvatarFallback>
                  {(fullName || nickname || currentEmail || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarChange}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar
                    ? "Загрузка..."
                    : avatarUrl
                    ? "Изменить фото"
                    : "Загрузить фото"}
                </Button>
                {avatarUrl && (
                  <Button variant="ghost" onClick={removeAvatar} disabled={uploadingAvatar}>
                    Удалить
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Никнейм и username</CardTitle>
            <CardDescription>Как вас будут видеть другие пользователи.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Никнейм</Label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={50}
                placeholder="Ваш отображаемый никнейм"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Username (уникальный)</Label>
              <Input
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                }
                minLength={3}
                maxLength={30}
                placeholder="johndoe"
              />
              <p className="text-xs text-muted-foreground">
                Только латинские буквы, цифры, _ и -. От 3 до 30 символов.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveNickname} disabled={savingNick || !nickDirty}>
                {savingNick ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>
              Привяжите другую почту. На новый адрес придёт письмо для подтверждения.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Текущий email</Label>
              <Input value={currentEmail} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Новый email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={changeEmail} disabled={savingEmail || !newEmail}>
                {savingEmail ? "Отправка..." : "Сменить email"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}