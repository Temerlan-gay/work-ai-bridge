import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Search, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { SkillMultiSelect } from "@/components/skill-multi-select";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Возможности - TalentBridge" }] }),
  component: OpportunitiesBrowse,
});

type Gender = "any" | "boy" | "girl";
type SortKey = "top" | "recent" | "deadline" | "budget_high" | "budget_low";

type Opportunity = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number | null;
  deadline: string | null;
  skills_required: string[] | null;
  boosted_at?: string | null;
  created_at: string;
  target_age_min?: number | null;
  target_age_max?: number | null;
  target_gender?: string | null;
  city?: string | null;
  format?: string | null;
};

interface Filters {
  q: string;
  category: string;
  skills: string[];
  gender: Gender;
  age: [number, number];
  city: string;
  format: string;
  budget: [number, number];
  deadline: string;
  qualities: string[];
  sort: SortKey;
}

const DEFAULT_FILTERS: Filters = {
  q: "",
  category: "all",
  skills: [],
  gender: "any",
  age: [7, 25],
  city: "",
  format: "any",
  budget: [0, 5000],
  deadline: "any",
  qualities: [],
  sort: "top",
};

const OPPORTUNITY_QUALITIES = [
  "футболист",
  "вратарь",
  "нападающий",
  "художник",
  "дизайнер",
  "фотограф",
  "музыкант",
  "вокалист",
  "программист",
  "робототехник",
  "олимпиадник",
  "математик",
  "актер",
  "танцор",
  "лидер",
  "командный",
  "волонтер",
  "тренер",
  "команда",
  "наставник",
  "публичные выступления",
  "креативность",
] as const;

function norm(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function activeBoost(boostedAt: string | null | undefined): number {
  if (!boostedAt) return 0;
  const started = new Date(boostedAt).getTime();
  return Date.now() - started < 7 * 24 * 60 * 60 * 1000 ? started : 0;
}

function opportunityText(p: Opportunity) {
  return `${p.title ?? ""} ${p.description ?? ""} ${p.category ?? ""} ${(p.skills_required ?? []).join(" ")} ${p.city ?? ""} ${p.format ?? ""}`.toLowerCase();
}

function detectGender(p: Opportunity): Gender | "unknown" {
  const explicit = norm(p.target_gender);
  if (explicit === "any" || explicit === "all" || explicit === "любой") return "any";
  if (explicit === "boy" || explicit === "male" || explicit === "мальчик" || explicit === "парень" || explicit === "юноша") return "boy";
  if (explicit === "girl" || explicit === "female" || explicit === "девочка" || explicit === "девушка") return "girl";
  const hay = opportunityText(p);
  if (/\b(мальчик|парень|юноша|male|boy)\b/i.test(hay)) return "boy";
  if (/\b(девочка|девушка|female|girl)\b/i.test(hay)) return "girl";
  return "unknown";
}

function deadlineMatches(deadline: string | null, filter: string) {
  if (filter === "any") return true;
  if (!deadline) return false;
  const due = new Date(deadline).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (filter === "week") return due <= now + 7 * day;
  if (filter === "month") return due <= now + 30 * day;
  if (filter === "future") return due > now + 30 * day;
  return true;
}

function ageMatches(p: Opportunity, [from, to]: [number, number]) {
  if (from === 7 && to === 25) return true;
  if (p.target_age_min != null || p.target_age_max != null) {
    const min = p.target_age_min ?? 7;
    const max = p.target_age_max ?? 25;
    return min <= to && max >= from;
  }
  const hay = opportunityText(p);
  const ranges = hay.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(лет|года|год)?/g) ?? [];
  return ranges.some((range) => {
    const nums = range.match(/\d{1,2}/g)?.map(Number) ?? [];
    if (nums.length < 2) return false;
    return nums[0] <= to && nums[1] >= from;
  });
}

function OpportunitiesBrowse() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase
        .from("projects")
        .select("*")
        .eq("status", "open")
        .order("boosted_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(300);
      if (filters.category !== "all") query = query.eq("category", filters.category);
      const { data } = await query;
      setItems((data ?? []) as Opportunity[]);
      setLoading(false);
    })();
  }, [filters.category]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const city = filters.city.trim().toLowerCase();
    const out = items.filter((p) => {
      const hay = opportunityText(p);
      if (q && !hay.includes(q)) return false;
      if (filters.skills.length && !filters.skills.every((skill) => (p.skills_required ?? []).includes(skill) || hay.includes(skill.toLowerCase()))) return false;
      if (filters.qualities.length && !filters.qualities.every((quality) => hay.includes(quality.toLowerCase()))) return false;
      if (filters.gender !== "any") {
        const gender = detectGender(p);
        if (gender !== "any" && gender !== filters.gender) return false;
      }
      if (!ageMatches(p, filters.age)) return false;
      if (city && !hay.includes(city)) return false;
      if (filters.format !== "any" && !hay.includes(filters.format)) return false;
      const budget = Number(p.budget ?? 0);
      if (budget < filters.budget[0] || budget > filters.budget[1]) return false;
      if (!deadlineMatches(p.deadline, filters.deadline)) return false;
      return true;
    });

    out.sort((a, b) => {
      const boostScore = activeBoost(b.boosted_at) - activeBoost(a.boosted_at);
      if (boostScore !== 0) return boostScore;
      switch (filters.sort) {
        case "deadline":
          return new Date(a.deadline ?? "2999-01-01").getTime() - new Date(b.deadline ?? "2999-01-01").getTime();
        case "budget_high":
          return Number(b.budget ?? 0) - Number(a.budget ?? 0);
        case "budget_low":
          return Number(a.budget ?? 0) - Number(b.budget ?? 0);
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "top":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
    (filters.gender !== "any" ? 1 : 0) +
    (filters.age[0] !== 7 || filters.age[1] !== 25 ? 1 : 0) +
    (filters.city.trim() ? 1 : 0) +
    (filters.format !== "any" ? 1 : 0) +
    (filters.budget[0] !== 0 || filters.budget[1] !== 5000 ? 1 : 0) +
    (filters.deadline !== "any" ? 1 : 0);

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
        <Label className="text-xs">Кого ищут</Label>
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
        <Label className="text-xs">Навыки</Label>
        <SkillMultiSelect value={filters.skills} onChange={(skills) => setFilters((f) => ({ ...f, skills }))} max={10} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Город</Label>
        <Input value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} placeholder="Например, Астана" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Формат занятий</Label>
        <Select value={filters.format} onValueChange={(v) => setFilters((f) => ({ ...f, format: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Любой</SelectItem>
            <SelectItem value="очно">Очно</SelectItem>
            <SelectItem value="онлайн">Онлайн</SelectItem>
            <SelectItem value="гибрид">Гибрид</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Оплата в месяц</Label>
          <span className="text-xs text-muted-foreground">${filters.budget[0]}-${filters.budget[1]}</span>
        </div>
        <Slider
          value={filters.budget}
          min={0}
          max={5000}
          step={25}
          onValueChange={(v) => setFilters((f) => ({ ...f, budget: [v[0], v[1]] as [number, number] }))}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">До какой даты ищут</Label>
        <Select value={filters.deadline} onValueChange={(v) => setFilters((f) => ({ ...f, deadline: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Любой срок</SelectItem>
            <SelectItem value="week">В течение недели</SelectItem>
            <SelectItem value="month">В течение месяца</SelectItem>
            <SelectItem value="future">Позже месяца</SelectItem>
          </SelectContent>
        </Select>
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
            <h1 className="text-3xl font-semibold tracking-tight">Объявления потребителей</h1>
            <p className="mt-1 text-sm text-muted-foreground">{filtered.length} из {items.length} объявлений</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Тренер, команда, футболист, 9-12 лет..."
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                className="pl-8"
              />
            </div>
            <Select value={filters.category} onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все сферы</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.sort} onValueChange={(v) => setFilters((f) => ({ ...f, sort: v as SortKey }))}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Сначала поднятые</SelectItem>
                <SelectItem value="recent">Новые</SelectItem>
                <SelectItem value="deadline">Скоро заканчивается</SelectItem>
                <SelectItem value="budget_high">Оплата выше</SelectItem>
                <SelectItem value="budget_low">Оплата ниже</SelectItem>
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

        <section className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Кого ищут потребители</h2>
              <p className="mt-1 text-xs text-muted-foreground">Можно найти объявления вроде: тренер, команда, футболист, мальчик, 9-12 лет, очно.</p>
            </div>
            {filters.qualities.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setFilters((f) => ({ ...f, qualities: [] }))}>Очистить</Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {OPPORTUNITY_QUALITIES.map((quality) => {
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
        </section>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-lg border border-border bg-card p-5">
              {filtersPanel}
            </div>
          </aside>
          <div>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-52 animate-pulse rounded-lg border border-border bg-card p-5" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <p className="text-sm text-muted-foreground">По выбранным качествам объявления не найдены. Попробуйте убрать часть фильтров или изменить возраст.</p>
                <Button variant="link" onClick={reset}>Сбросить фильтры</Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => (
                  <Link key={p.id} to="/projects/$id" params={{ id: p.id }} className="rounded-lg border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{p.category}</span>
                      {p.boosted_at && Date.now() - new Date(p.boosted_at).getTime() < 7 * 24 * 60 * 60 * 1000 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">TOP</span>
                      )}
                    </div>
                    <div className="mb-1 line-clamp-2 font-medium">{p.title}</div>
                    <div className="line-clamp-3 text-sm text-muted-foreground">{p.description}</div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(p.skills_required ?? []).slice(0, 4).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[11px] font-normal">{skill}</Badge>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-primary">
                        {p.budget ? `$${Number(p.budget).toLocaleString("ru-RU")}/мес` : "Оплата по договоренности"}
                      </span>
                      {p.deadline && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="size-3" />
                          {new Date(p.deadline).toLocaleDateString("ru-RU")}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
