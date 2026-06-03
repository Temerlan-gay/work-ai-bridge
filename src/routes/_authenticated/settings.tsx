import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

  useEffect(() => {
    if (!user) return;
    setCurrentEmail(user.email ?? "");
    supabase
      .from("profiles")
      .select("nickname, username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setNickname(data?.nickname ?? "");
        setUsername(data?.username ?? "");
        setInitialNickname(data?.nickname ?? "");
        setInitialUsername(data?.username ?? "");
      });
  }, [user]);

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