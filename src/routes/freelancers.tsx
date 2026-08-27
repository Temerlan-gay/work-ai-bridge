import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FreelancerCard, isOnline, type FreelancerRow } from "@/components/freelancer-card";
import { SkillMultiSelect } from "@/components/skill-multi-select";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES, COUNTRIES, SPECIALIZATIONS } from "@/lib/categories";
import { openOrCreateChat } from "@/lib/open-chat";
import { toast } from "sonner";

export const Route = createFileRoute("/freelancers")({
  head: () => ({
    meta: [
      { title: "Таланты - TalentBridge" },
      {
        name: "description",
        content: "Каталог талантливых подростков с фильтрами по сфере, возрасту, полу, городу, навыкам и готовности к предложениям.",
      },
    ],
  }),
  component: Talents,
});

type SortKey = "top" | "recent" | "age_low" | "age_high" | "rating" | "projects";
type DateRange = "all" | "week" | "month" | "3months" | "year";
type Gender = "any" | "boy" | "girl";

interface Filters {
  q: string;
  skills: string[];
  category: string;
  specialization: string;
  gender: Gender;
  age: [number, number];
  country: string;
  city: string;
  onlineOnly: boolean;
  availability: string;
  registered: DateRange;
  minRating: number;
  minProjects: number;
  qualities: string[];
  sort: SortKey;
}

const DEFAULT_FILTERS: Filters = {
  q: "",
  skills: [],
  category: "any",
  specialization: "any",
  gender: "any",
  age: [7, 25],
  country: "any",
  city: "",
  onlineOnly: false,
  availability: "any",
  registered: "all",
  minRating: 0,
  minProjects: 0,
  qualities: [],
  sort: "top",
};

const QUALITY_GROUPS = [
  {
    title: "Спорт",
    items: ["футболист", "нападающий", "вратарь", "защитник", "баскетболист", "волейболист", "пловец", "шахматист", "выносливость", "капитан команды"],
  },
  {
    title: "Творчество",
    items: ["художник", "иллюстратор", "дизайнер", "фотограф", "видеограф", "монтажер", "актер", "танцор", "музыкант", "вокалист"],
  },
  {
    title: "Наука и технологии",
    items: ["программист", "робототехник", "математик", "физик", "химик", "биолог", "исследователь", "олимпиадник", "разработчик игр", "AI/ML"],
  },
  {
    title: "Личные качества",
    items: ["ответственный", "лидер", "командный", "креативный", "усидчивый", "публичные выступления", "организатор", "волонтер", "наставник"],
  },
] as const;

function dateCutoff(r: DateRange): number | null {
  const day = 24 * 60 * 60 * 1000;
  if (r === "week") return Date.now() - 7 * day;
  if (r === "month") return Date.now() - 30 * day;
  if (r === "3months") return Date.now() - 90 * day;
  if (r === "year") return Date.now() - 365 * day;
  return null;
}

function activeBoost(boostedAt: string | null | undefined): number {
  if (!boostedAt) return 0;
  const started = new Date(boostedAt).getTime();
  return Date.now() - started < 7 * 24 * 60 * 60 * 1000 ? started : 0;
}

function norm(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function detectGender(profile: FreelancerRow): Gender | "unknown" {
  const explicit = norm(profile.gender);
  if (explicit === "boy" || explicit === "male" || explicit === "мальчик" || explicit === "парень" || explicit === "юноша") return "boy";
  if (explicit === "girl" || explicit === "female" || explicit === "девочка" || explicit === "девушка") return "girl";
  const hay = `${profile.bio ?? ""} ${profile.specialization ?? ""} ${(profile.skills ?? []).join(" ")}`.toLowerCase();
  if (/\b(мальчик|парень|юноша|male|boy)\b/i.test(hay)) return "boy";
  if (/\b(девочка|девушка|female|girl)\b/i.test(hay)) return "girl";
  return "unknown";
}

function matchesAnyText(profile: FreelancerRow, value: string) {
  const hay = `${profile.full_name ?? ""} ${profile.username ?? ""} ${profile.bio ?? ""} ${profile.specialization ?? ""} ${(profile.skills ?? []).join(" ")}`.toLowerCase();
  return hay.includes(value.toLowerCase());
}

function Talents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<FreelancerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const loadTalents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("freelancer_directory")
      .select("*")
      .limit(300);
    if (error) toast.error(error.message);
    setItems((data ?? []) as FreelancerRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadTalents();
  }, []);

  const message = async (otherId: string) => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (user.id === otherId) {
      toast.info("Это ваш профиль");
      return;
    }
    try {
      const id = await openOrCreateChat(user.id, otherId);
      if (id) navigate({ to: "/chats/$id", params: { id } });
    } catch (e: any) {
      toast.error(e.message ?? "Не удалось открыть чат");
    }
  };

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const city = filters.city.trim().toLowerCase();
    const cutoff = dateCutoff(filters.registered);
    const out = items.filter((p) => {
      if (q && !matchesAnyText(p, q)) return false;
      if (filters.skills.length && !filters.skills.every((s) => (p.skills ?? []).includes(s))) return false;
      if (filters.category !== "any" && !matchesAnyText(p, filters.category)) return false;
      if (filters.specialization !== "any" && p.specialization !== filters.specialization && !matchesAnyText(p, filters.specialization)) return false;
      if (filters.qualities.length && !filters.qualities.every((quality) => matchesAnyText(p, quality))) return false;
      if (filters.gender !== "any" && detectGender(p) !== filters.gender) return false;
      if (p.age != null && (Number(p.age) < filters.age[0] || Number(p.age) > filters.age[1])) return false;
      if (p.age == null && (filters.age[0] !== 7 || filters.age[1] !== 25)) return false;
      if (filters.country !== "any" && p.country !== filters.country) return false;
      if (city && !norm(`${p.city ?? ""} ${p.country ?? ""}`).includes(city)) return false;
      if (filters.minRating > 0 && (p.avg_rating ?? 0) < filters.minRating) return false;
      if (filters.minProjects > 0 && (p.completed_projects ?? 0) < filters.minProjects) return false;
      if (filters.onlineOnly && !isOnline(p.last_seen_at)) return false;
      if (filters.availability !== "any" && p.availability !== filters.availability) return false;
      if (cutoff && new Date(p.created_at).getTime() < cutoff) return false;
      return true;
    });

    out.sort((a, b) => {
      const boostScore = activeBoost(b.boosted_at) - activeBoost(a.boosted_at);
      if (boostScore !== 0) return boostScore;
      switch (filters.sort) {
        case "age_low":
          return (a.age ?? 999) - (b.age ?? 999);
        case "age_high":
          return (b.age ?? -1) - (a.age ?? -1);
        case "rating":
          return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
        case "projects":
          return (b.completed_projects ?? 0) - (a.completed_projects ?? 0);
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "top":
        default:
          return (b.avg_rating ?? 0) - (a.avg_rating ?? 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return out;
  }, [items, filters]);

  const toggleQuality = (quality: string) => {
    setFilters((f) => ({
      ...f,
      qualities: f.qualities.includes(quality)
        ? f.qualities.filter((item) => item !== quality)
        : [...f.qualities, quality],
    }));
  };

  const reset = () => setFilters(DEFAULT_FILTERS);

  const activeCount =
    (filters.skills.length ? 1 : 0) +
    (filters.qualities.length ? 1 : 0) +
    (filters.category !== "any" ? 1 : 0) +
    (filters.specialization !== "any" ? 1 : 0) +
    (filters.gender !== "any" ? 1 : 0) +
    (filters.age[0] !== 7 || filters.age[1] !== 25 ? 1 : 0) +
    (filters.country !== "any" ? 1 : 0) +
    (filters.city.trim() ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.minProjects > 0 ? 1 : 0) +
    (filters.onlineOnly ? 1 : 0) +
    (filters.availability !== "any" ? 1 : 0) +
    (filters.registered !== "all" ? 1 : 0);

  const filtersPanel = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Фильтры</h3>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs">
            <X className="size-3" /> Сбросить
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Сфера</Label>
        <Select value={filters.category} onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Любая сфера</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Специализация</Label>
        <Select value={filters.specialization} onValueChange={(v) => setFilters((f) => ({ ...f, specialization: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Любая специализация</SelectItem>
            {SPECIALIZATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Пол</Label>
          <Select value={filters.gender} onValueChange={(v) => setFilters((f) => ({ ...f, gender: v as Gender }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Любой</SelectItem>
              <SelectItem value="boy">Мальчик</SelectItem>
              <SelectItem value="girl">Девочка</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Страна</Label>
          <Select value={filters.country} onValueChange={(v) => setFilters((f) => ({ ...f, country: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Любая</SelectItem>
              {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Возраст</Label>
          <span className="text-xs text-muted-foreground">{filters.age[0]}-{filters.age[1]} лет</span>
        </div>
        <Slider
          value={filters.age}
          min={7}
          max={25}
          step={1}
          onValueChange={(v) => setFilters((f) => ({ ...f, age: [v[0], v[1]] as [number, number] }))}
        />
        <div className="flex flex-wrap gap-1.5">
          {[
            [7, 8],
            [9, 12],
            [13, 15],
            [16, 18],
            [19, 25],
          ].map(([from, to]) => (
            <Button key={`${from}-${to}`} type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setFilters((f) => ({ ...f, age: [from, to] }))}>
              {from}-{to}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Город</Label>
        <Input value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} placeholder="Например, Алматы" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Навыки</Label>
        <SkillMultiSelect value={filters.skills} onChange={(skills) => setFilters((f) => ({ ...f, skills }))} max={10} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Статус</Label>
        <Select value={filters.availability} onValueChange={(v) => setFilters((f) => ({ ...f, availability: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Любой</SelectItem>
            <SelectItem value="available">Готов к предложениям</SelectItem>
            <SelectItem value="busy">Занят учебой/проектом</SelectItem>
            <SelectItem value="not_available">Пока не доступен</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Регистрация</Label>
        <Select value={filters.registered} onValueChange={(v) => setFilters((f) => ({ ...f, registered: v as DateRange }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Любое время</SelectItem>
            <SelectItem value="week">Последняя неделя</SelectItem>
            <SelectItem value="month">Последний месяц</SelectItem>
            <SelectItem value="3months">Последние 3 месяца</SelectItem>
            <SelectItem value="year">Последний год</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Рейтинг от</Label>
          <Input type="number" min={0} max={5} step={0.5} value={filters.minRating} onChange={(e) => setFilters((f) => ({ ...f, minRating: Number(e.target.value) || 0 }))} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Работ от</Label>
          <Input type="number" min={0} value={filters.minProjects} onChange={(e) => setFilters((f) => ({ ...f, minProjects: Number(e.target.value) || 0 }))} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <Label className="text-xs">Онлайн сейчас</Label>
          <p className="text-[11px] text-muted-foreground">Активен за последние 5 минут</p>
        </div>
        <Switch checked={filters.onlineOnly} onCheckedChange={(v) => setFilters((f) => ({ ...f, onlineOnly: v }))} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pt-4"><BackButton /></div>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Каталог подростков</h1>
            <p className="mt-1 text-sm text-muted-foreground">{filtered.length} из {items.length} профилей</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Футболист, художник, город, навык..."
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                className="pl-8"
              />
            </div>
            <Select value={filters.sort} onValueChange={(v) => setFilters((f) => ({ ...f, sort: v as SortKey }))}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Сначала лучшие</SelectItem>
                <SelectItem value="recent">Новые</SelectItem>
                <SelectItem value="age_low">Младше</SelectItem>
                <SelectItem value="age_high">Старше</SelectItem>
                <SelectItem value="rating">По рейтингу</SelectItem>
                <SelectItem value="projects">По работам</SelectItem>
              </SelectContent>
            </Select>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative lg:hidden">
                  <SlidersHorizontal className="size-4" />
                  {activeCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {activeCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[340px] overflow-y-auto">
                <div className="pt-6">{filtersPanel}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <section className="mb-6 space-y-4 rounded-lg border border-border bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold">Быстрый выбор качеств</h2>
            <p className="mt-1 text-xs text-muted-foreground">Можно собрать запрос вроде: футболист, 9-12 лет, мальчик, Алматы, капитан команды.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {QUALITY_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">{group.title}</div>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((quality) => {
                    const active = filters.qualities.includes(quality);
                    return (
                      <button
                        key={quality}
                        type="button"
                        onClick={() => toggleQuality(quality)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent"}`}
                      >
                        {quality}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {filters.qualities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.qualities.map((quality) => (
                <Badge key={quality} variant="secondary" className="gap-1">
                  {quality}
                  <button type="button" onClick={() => toggleQuality(quality)} className="text-muted-foreground hover:text-foreground">x</button>
                </Badge>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-lg border border-border bg-card p-5">
              {filtersPanel}
            </div>
          </aside>
          <div>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-56 animate-pulse rounded-lg border border-border bg-card p-5" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <p className="text-sm text-muted-foreground">По выбранным качествам подростки не найдены. Попробуйте убрать часть фильтров или изменить возраст.</p>
                <Button variant="link" onClick={reset}>Сбросить фильтры</Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p) => (
                  <FreelancerCard key={p.id} p={p} onMessage={message} selfId={user?.id} onBoosted={loadTalents} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
