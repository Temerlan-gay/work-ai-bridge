import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkillMultiSelect } from "@/components/skill-multi-select";
import { AVAILABILITY_OPTIONS, COUNTRIES, SPECIALIZATIONS } from "@/lib/categories";
import { toast } from "sonner";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { aiProfileAdvisor, aiResumeAssistant } from "@/lib/ai/functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Настройки - WorkBridge" }] }),
  component: SettingsPage,
});

type UserKind = "freelancer" | "client";
type Links = { github?: string; linkedin?: string };

function normalizeUsername(value: string) {
  const cleaned = value.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
  return cleaned || null;
}

function SettingsPage() {
  const { user } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [kind, setKind] = useState<UserKind>("freelancer");
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("Russia");
  const [city, setCity] = useState("");
  const [age, setAge] = useState("");
  const [specializationChoice, setSpecializationChoice] = useState("Fullstack Developer");
  const [specializationOther, setSpecializationOther] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [yearsExp, setYearsExp] = useState("");
  const [availability, setAvailability] = useState("available");
  const [hourlyRate, setHourlyRate] = useState("");
  const [bio, setBio] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");

  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileForAi, setProfileForAi] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  const [resumeText, setResumeText] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeAdvice, setResumeAdvice] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    setCurrentEmail(user.email ?? "");
    setLoadingProfile(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        setLoadingProfile(false);
        if (error) {
          toast.error(error.message);
          return;
        }

        const links = (data?.links ?? {}) as Links;
        const specialization = data?.specialization ?? "Fullstack Developer";

        setKind((data?.kind ?? "freelancer") as UserKind);
        setFullName(data?.full_name ?? "");
        setNickname(data?.nickname ?? "");
        setUsername(data?.username ?? "");
        setCountry(data?.country ?? "Russia");
        setCity(data?.city ?? "");
        setAge(data?.age ? String(data.age) : "");
        setSpecializationChoice(
          SPECIALIZATIONS.includes(specialization as any) ? specialization : "Other",
        );
        setSpecializationOther(
          SPECIALIZATIONS.includes(specialization as any) ? "" : specialization,
        );
        setSelectedSkills(data?.skills ?? []);
        setYearsExp(data?.years_experience ? String(data.years_experience) : "");
        setAvailability(data?.availability ?? "available");
        setHourlyRate(data?.hourly_rate ? String(data.hourly_rate) : "");
        setBio(data?.bio ?? "");
        setGithub(links.github ?? "");
        setLinkedin(links.linkedin ?? "");
        setAvatarUrl(data?.avatar_url ?? null);
        setProfileForAi(data ?? null);
      });
  }, [user]);

  const currentProfilePayload = () => {
    const cleanedUsername = normalizeUsername(username);
    const specialization =
      specializationChoice === "Other" ? specializationOther.trim() : specializationChoice;

    return {
      id: user!.id,
      full_name: fullName.trim() || null,
      nickname: nickname.trim() || null,
      username: cleanedUsername,
      kind,
      country: country || null,
      city: city.trim() || null,
      age: age ? Number(age) : null,
      specialization: specialization || null,
      skills: selectedSkills,
      years_experience: yearsExp ? Number(yearsExp) : null,
      availability,
      hourly_rate: hourlyRate ? Number(hourlyRate) : null,
      bio: bio.trim() || null,
      links: { github: github.trim(), linkedin: linkedin.trim() },
      onboarded: true,
    };
  };

  const saveProfile = async () => {
    if (!user) return;

    const cleanedUsername = normalizeUsername(username);
    if (cleanedUsername && cleanedUsername.length < 3) {
      toast.error("Username должен содержать минимум 3 символа");
      return;
    }
    if (age && (Number(age) < 14 || Number(age) > 120)) {
      toast.error("Возраст должен быть от 14 до 120");
      return;
    }
    if (yearsExp && Number(yearsExp) < 0) {
      toast.error("Опыт не может быть отрицательным");
      return;
    }
    if (hourlyRate && Number(hourlyRate) < 0) {
      toast.error("Ставка не может быть отрицательной");
      return;
    }

    setSavingProfile(true);
    const payload = currentProfilePayload();
    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();
    setSavingProfile(false);

    if (error) {
      if (error.code === "23505") toast.error("Этот nickname или username уже занят");
      else toast.error(error.message);
      return;
    }

    setUsername(cleanedUsername ?? "");
    setProfileForAi(data);
    toast.success("Настройки сохранены");
  };

  const updateAvatarUrl = async (
    nextAvatarUrl: string | null,
  ): Promise<{ data: any; error: { message: string } | null }> => {
    if (!user) return { data: null, error: null };
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ ...currentProfilePayload(), avatar_url: nextAvatarUrl }, { onConflict: "id" })
      .select("*")
      .single();
    return { data, error };
  };

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
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setUploadingAvatar(false);
      toast.error(uploadError.message);
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;
    const { data, error } = await updateAvatarUrl(publicUrl);
    setUploadingAvatar(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setAvatarUrl(publicUrl);
    setProfileForAi(data);
    toast.success("Фото профиля обновлено");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    const { data, error } = await updateAvatarUrl(null);
    setUploadingAvatar(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setAvatarUrl(null);
    setProfileForAi(data);
    toast.success("Фото удалено");
  };

  const changeEmail = async () => {
    const email = newEmail.trim();
    if (!email || email === currentEmail) {
      toast.error("Введите новый email");
      return;
    }

    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email });
    setSavingEmail(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Письмо для подтверждения отправлено на новый email");
    setNewEmail("");
  };

  const getProfileAdvice = async () => {
    if (!profileForAi) {
      toast.info("Сначала сохраните профиль");
      return;
    }

    setAiLoading(true);
    try {
      const result = await aiProfileAdvisor({ data: { profile: profileForAi } });
      setAiAdvice(result);
    } catch (e: any) {
      toast.error(e.message ?? "AI profile advisor failed");
    } finally {
      setAiLoading(false);
    }
  };

  const readResumeFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setResumeText(text.slice(0, 12000));
  };

  const analyzeResume = async () => {
    if (resumeText.trim().length < 20) {
      toast.error("Вставьте текст резюме или выберите текстовый файл");
      return;
    }

    setResumeLoading(true);
    try {
      const result = await aiResumeAssistant({ data: { resumeText } });
      setResumeAdvice(result);
    } catch (e: any) {
      toast.error(e.message ?? "AI resume assistant failed");
    } finally {
      setResumeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <BackButton />
      </div>
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
          <p className="text-sm text-muted-foreground">
            Управляйте профилем, фото, навыками и привязанной почтой.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Профиль</CardTitle>
            <CardDescription>
              Эти данные видят клиенты и фрилансеры на страницах каталога и проектов.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loadingProfile ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Загрузка профиля...
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Роль</Label>
                    <Select value={kind} onValueChange={(value) => setKind(value as UserKind)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freelancer">Фрилансер</SelectItem>
                        <SelectItem value="client">Клиент</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Доступность</Label>
                    <Select value={availability} onValueChange={setAvailability}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABILITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Имя</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Никнейм</Label>
                    <Input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={50}
                      placeholder="Ваш отображаемый никнейм"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    minLength={3}
                    maxLength={30}
                    placeholder="johndoe"
                  />
                  <p className="text-xs text-muted-foreground">
                    Только латинские буквы, цифры, _ и -. От 3 до 30 символов.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Страна</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Город</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Возраст</Label>
                    <Input
                      type="number"
                      min={14}
                      max={120}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Специализация</Label>
                  <Select value={specializationChoice} onValueChange={setSpecializationChoice}>
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
                  {specializationChoice === "Other" && (
                    <Input
                      className="mt-2"
                      value={specializationOther}
                      onChange={(e) => setSpecializationOther(e.target.value)}
                      placeholder="Введите специализацию"
                    />
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Опыт, лет</Label>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={yearsExp}
                      onChange={(e) => setYearsExp(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ставка в час, USD</Label>
                    <Input
                      type="number"
                      min={0}
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Навыки</Label>
                  <SkillMultiSelect value={selectedSkills} onChange={setSelectedSkills} max={15} />
                </div>

                <div className="space-y-1.5">
                  <Label>О себе</Label>
                  <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>GitHub</Label>
                    <Input value={github} onChange={(e) => setGithub(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>LinkedIn</Label>
                    <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveProfile} disabled={savingProfile}>
                    {savingProfile ? "Сохранение..." : "Сохранить профиль"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Фото профиля</CardTitle>
            <CardDescription>Загрузите аватар JPG, PNG или WebP до 5 МБ.</CardDescription>
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
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                  {uploadingAvatar ? "Загрузка..." : avatarUrl ? "Изменить фото" : "Загрузить фото"}
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
            <CardTitle>Email</CardTitle>
            <CardDescription>
              На новый адрес придет письмо для подтверждения смены почты.
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
              <Button onClick={changeEmail} disabled={savingEmail || !newEmail.trim()}>
                {savingEmail ? "Отправка..." : "Сменить email"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-4 text-primary" /> AI Profile Advisor
            </CardTitle>
            <CardDescription>
              AI подскажет, как улучшить позиционирование, навыки и портфолио.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={getProfileAdvice} disabled={aiLoading || !profileForAi}>
              {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Analyze profile
            </Button>
            {aiAdvice && (
              <div className="space-y-3 text-sm">
                {aiAdvice.headline && (
                  <div className="rounded-md border border-border p-3">
                    <div className="text-xs font-medium text-muted-foreground">Suggested headline</div>
                    <p className="mt-1">{aiAdvice.headline}</p>
                  </div>
                )}
                {aiAdvice.betterBio && (
                  <div className="rounded-md border border-border p-3">
                    <div className="text-xs font-medium text-muted-foreground">Better bio</div>
                    <p className="mt-1 whitespace-pre-wrap">{aiAdvice.betterBio}</p>
                  </div>
                )}
                {aiAdvice.missingSkills?.length > 0 && (
                  <div className="rounded-md border border-border p-3">
                    <div className="text-xs font-medium text-muted-foreground">Missing skills</div>
                    <p className="mt-1">{aiAdvice.missingSkills.join(", ")}</p>
                  </div>
                )}
                {aiAdvice.portfolioImprovements?.length > 0 && (
                  <div className="rounded-md border border-border p-3">
                    <div className="text-xs font-medium text-muted-foreground">Portfolio improvements</div>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {aiAdvice.portfolioImprovements.map((item: string) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-4 text-primary" /> AI Resume Assistant
            </CardTitle>
            <CardDescription>
              Проверьте текст резюме. Файлы не загружаются и не сохраняются автоматически.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept=".txt,.md,.csv,.json"
              onChange={(e) => readResumeFile(e.target.files?.[0])}
            />
            <Textarea
              rows={6}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Вставьте текст резюме..."
            />
            <Button variant="outline" onClick={analyzeResume} disabled={resumeLoading}>
              {resumeLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Analyze resume
            </Button>
            {resumeAdvice && (
              <div className="space-y-3 text-sm">
                <div className="rounded-md border border-border p-3">
                  <div className="text-xs font-medium text-muted-foreground">Weaknesses</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {(resumeAdvice.weaknesses ?? []).map((item: string) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-md border border-border p-3">
                  <div className="text-xs font-medium text-muted-foreground">Suggested improvements</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {(resumeAdvice.improvements ?? []).map((item: string) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                {resumeAdvice.rewrittenSummary && (
                  <div className="rounded-md border border-border p-3">
                    <div className="text-xs font-medium text-muted-foreground">Rewritten summary</div>
                    <p className="mt-1 whitespace-pre-wrap">{resumeAdvice.rewrittenSummary}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
