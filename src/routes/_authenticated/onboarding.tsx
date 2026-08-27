import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { COUNTRIES, SPECIALIZATIONS } from "@/lib/categories";
import { toast } from "sonner";
import { Briefcase, User } from "lucide-react";
import { SkillMultiSelect } from "@/components/skill-multi-select";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Начало - TalentBridge" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<"freelancer" | "client">("freelancer");
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [yearsExp, setYearsExp] = useState<string>("");
  const [availability, setAvailability] = useState<string>("available");
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [country, setCountry] = useState<string>("Russia");
  const [city, setCity] = useState("");
  const [age, setAge] = useState<string>("");
  const [specializationChoice, setSpecializationChoice] = useState<string>("Футболист");
  const [specializationOther, setSpecializationOther] = useState("");
  const [skills, setSkills] = useState("");
  const [bio, setBio] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata ?? {};
    if (typeof meta.full_name === "string") setFullName(meta.full_name);
    if (typeof meta.specialization === "string") setSpecializationChoice(meta.specialization);

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.onboarded) navigate({ to: "/dashboard", replace: true });
        if (data) {
          setFullName(data.full_name ?? meta.full_name ?? "");
          setNickname(data.nickname ?? "");
          if (data.specialization) setSpecializationChoice(data.specialization);
        }
      });
  }, [user, navigate]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const specialization =
      specializationChoice === "Другое" ? specializationOther.trim() : specializationChoice;
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: fullName,
        nickname: nickname || null,
        username: username ? username.toLowerCase().trim() : null,
        kind,
        country,
        city,
        age: age ? Number(age) : null,
        specialization,
        skills: selectedSkills.length
          ? selectedSkills
          : skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
        years_experience: yearsExp ? Number(yearsExp) : null,
        availability,
        hourly_rate: hourlyRate ? Number(hourlyRate) : null,
        bio,
        links: { github, linkedin },
        onboarded: true,
      },
      { onConflict: "id" },
    );

    await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: kind })
      .then(() => {});
    setSaving(false);

    if (error) toast.error(error.message);
    else {
      toast.success("Профиль TalentBridge готов!");
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          Шаг {step} из 3
        </div>
        {step === 1 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Я хочу...</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Выберите роль на платформе. Ее можно изменить позже.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => setKind("freelancer")}
                className={`text-left rounded-xl border p-5 transition ${kind === "freelancer" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"}`}
              >
                <Briefcase className="size-5 mb-3 text-primary" />
                <div className="font-medium">Подросток</div>
                <div className="text-sm text-muted-foreground">
                  Найти наставников, команды, проекты и возможности для роста.
                </div>
              </button>
              <button
                onClick={() => setKind("client")}
                className={`text-left rounded-xl border p-5 transition ${kind === "client" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"}`}
              >
                <User className="size-5 mb-3 text-primary" />
                <div className="font-medium">Потребитель</div>
                <div className="text-sm text-muted-foreground">
                  Публиковать задания, отборы, секции и мероприятия.
                </div>
              </button>
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={() => setStep(2)}>Далее</Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">О вас</h1>
            <p className="text-sm text-muted-foreground mb-6">Заполните базовые данные профиля.</p>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Имя и фамилия</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Никнейм</Label>
                  <Input value={nickname} onChange={(e) => setNickname(e.target.value)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Уникальное имя профиля</Label>
                  <Input
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                    }
                    placeholder="ivan_football"
                    minLength={3}
                    maxLength={30}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Статус</Label>
                  <Select value={availability} onValueChange={setAvailability}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Готов к предложениям</SelectItem>
                      <SelectItem value="busy">Занят учебой/проектом</SelectItem>
                      <SelectItem value="not_available">Пока не доступен</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Страна</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
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
                    min={7}
                    max={25}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Направление / профессия</Label>
                <Select value={specializationChoice} onValueChange={setSpecializationChoice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {specializationChoice === "Другое" && (
                  <Input
                    className="mt-2"
                    placeholder="Введите свое направление"
                    value={specializationOther}
                    onChange={(e) => setSpecializationOther(e.target.value)}
                  />
                )}
              </div>

              {kind === "freelancer" && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Лет практики</Label>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        value={yearsExp}
                        onChange={(e) => setYearsExp(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Желаемое вознаграждение ($)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Навыки и сильные стороны</Label>
                    <SkillMultiSelect value={selectedSkills} onChange={setSelectedSkills} max={15} />
                  </div>
                </>
              )}

              {kind === "client" && (
                <div className="space-y-1.5">
                  <Label>Какие таланты вы обычно ищете (необязательно)</Label>
                  <Input
                    placeholder="Футбол, рисунок, робототехника"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Назад
              </Button>
              <Button onClick={() => setStep(3)}>Далее</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Последние детали</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Добавьте описание, достижения и ссылки.
            </p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>О себе и достижениях</Label>
                <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>GitHub / портфолио</Label>
                  <Input
                    placeholder="username или ссылка"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Соцсеть / резюме</Label>
                  <Input
                    placeholder="ссылка"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Назад
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Сохраняем..." : "Сохранить и продолжить"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
