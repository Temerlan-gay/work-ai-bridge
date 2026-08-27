import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bot, Loader2, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { FreelancerCard, isOnline, type FreelancerRow } from "@/components/freelancer-card";
import { SkillMultiSelect } from "@/components/skill-multi-select";
import { useAuth } from "@/hooks/use-auth";
import { aiFreelancerMatching } from "@/lib/ai/functions";
import { AI_MATCH_BOTS, type AiMatchBotId } from "@/lib/ai/bots";
import { COUNTRIES } from "@/lib/categories";
import { openOrCreateChat } from "@/lib/open-chat";
import { toast } from "sonner";

export const Route = createFileRoute("/freelancers")({
  head: () => ({
    meta: [
      { title: "Таланты - TalentBridge" },
      {
        name: "description",
        content: "Каталог подростков по талантам, навыкам, городу и готовности к предложениям.",
      },
    ],
  }),
  component: Talents,
});

type SortKey = "rating" | "rate_low" | "rate_high" | "recent" | "projects";
type DateRange = "all" | "week" | "month" | "3months" | "year";

interface Filters {
  q: string;
  skills: string[];
  country: string;
  minRating: number;
  minProjects: number;
  rate: [number, number];
  onlineOnly: boolean;
  availability: string;
  registered: DateRange;
  sort: SortKey;
}

const DEFAULT_FILTERS: Filters = {
  q: "",
  skills: [],
  country: "any",
  minRating: 0,
  minProjects: 0,
  rate: [0, 300],
  onlineOnly: false,
  availability: "any",
  registered: "all",
  sort: "rating",
};

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

function Talents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<FreelancerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiMatching, setAiMatching] = useState(false);
  const [aiOrder, setAiOrder] = useState<Record<string, number>>({});
  const [matchIds, setMatchIds] = useState<string[] | null>(null);
  const [matchReasons, setMatchReasons] = useState<Record<string, string[]>>({});
  const [consumerBrief, setConsumerBrief] = useState("");
  const [selectedBot, setSelectedBot] = useState<AiMatchBotId>("mentor_match");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const loadTalents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("freelancer_directory")
      .select("*")
      .limit(200);
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
    const cutoff = dateCutoff(filters.registered);
    const out = items.filter((p) => {
      if (matchIds && !matchIds.includes(p.id ?? "")) return false;
      if (q) {
        const hay = `${p.full_name ?? ""} ${p.username ?? ""} ${p.bio ?? ""} ${p.specialization ?? ""} ${(p.skills ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.skills.length && !filters.skills.every((s) => (p.skills ?? []).includes(s))) return false;
      if (filters.country !== "any" && p.country !== filters.country) return false;
      if (filters.minRating > 0 && (p.avg_rating ?? 0) < filters.minRating) return false;
      if (filters.minProjects > 0 && (p.completed_projects ?? 0) < filters.minProjects) return false;
      const rate = p.hourly_rate != null ? Number(p.hourly_rate) : null;
      if (rate != null && (rate < filters.rate[0] || rate > filters.rate[1])) return false;
      if (filters.onlineOnly && !isOnline(p.last_seen_at)) return false;
      if (filters.availability !== "any" && p.availability !== filters.availability) return false;
      if (cutoff && new Date(p.created_at).getTime() < cutoff) return false;
      return true;
    });

    out.sort((a, b) => {
      const boostScore = activeBoost(b.boosted_at) - activeBoost(a.boosted_at);
      if (boostScore !== 0) return boostScore;
      const aiScore = (aiOrder[b.id ?? ""] ?? 0) - (aiOrder[a.id ?? ""] ?? 0);
      if (aiScore !== 0) return aiScore;
      switch (filters.sort) {
        case "rating":
          return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
        case "rate_low":
          return (a.hourly_rate ?? Infinity) - (b.hourly_rate ?? Infinity);
        case "rate_high":
          return (b.hourly_rate ?? -1) - (a.hourly_rate ?? -1);
        case "projects":
          return (b.completed_projects ?? 0) - (a.completed_projects ?? 0);
        case "recent":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return out;
  }, [items, filters, matchIds, aiOrder]);

  const reset = () => setFilters(DEFAULT_FILTERS);

  const aiMatch = async () => {
    const prompt = consumerBrief.trim();
    if (!prompt) {
      toast.info("Опишите, какого подростка или талант вы ищете.");
      return;
    }
    setAiMatching(true);
    try {
      const result = await aiFreelancerMatching({
        data: {
          project: {
            description: prompt,
            skills: filters.skills,
            minRating: filters.minRating,
            minProjects: filters.minProjects,
            budgetRateRange: filters.rate,
            availability: filters.availability,
          },
          freelancers: items.map((p) => ({
            id: p.id,
            full_name: p.full_name,
            skills: p.skills,
            bio: p.bio,
            specialization: p.specialization,
            avg_rating: p.avg_rating,
            completed_projects: p.completed_projects,
            last_seen_at: p.last_seen_at,
            hourly_rate: p.hourly_rate,
          })),
          botId: selectedBot,
        },
      });
      const next: Record<string, number> = {};
      const reasons: Record<string, string[]> = {};
      const ids: string[] = [];
      for (const row of result.rankings ?? []) {
        next[row.id] = row.score;
        reasons[row.id] = row.reasons ?? [];
        ids.push(row.id);
      }
      setAiOrder(next);
      setMatchReasons(reasons);
      setMatchIds(ids);
      if (ids.length === 0) toast.info("По вашему запросу подходящих подростков пока не найдено.");
      else toast.success("AI нашел подходящих подростков");
    } catch (e: any) {
      toast.error(e.message ?? "AI-подбор временно недоступен");
    } finally {
      setAiMatching(false);
    }
  };

  const activeCount =
    (filters.skills.length ? 1 : 0) +
    (filters.country !== "any" ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.minProjects > 0 ? 1 : 0) +
    (filters.rate[0] !== 0 || filters.rate[1] !== 300 ? 1 : 0) +
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
        <Label className="text-xs">Навыки</Label>
        <SkillMultiSelect
          value={filters.skills}
          onChange={(skills) => setFilters((f) => ({ ...f, skills }))}
          max={10}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Страна</Label>
        <Select value={filters.country} onValueChange={(v) => setFilters((f) => ({ ...f, country: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Любая страна</SelectItem>
            {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Вознаграждение</Label>
          <span className="text-xs text-muted-foreground">${filters.rate[0]}-{filters.rate[1]}/час</span>
        </div>
        <Slider
          value={filters.rate}
          min={0}
          max={300}
          step={5}
          onValueChange={(v) => setFilters((f) => ({ ...f, rate: [v[0], v[1]] as [number, number] }))}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Минимальный рейтинг</Label>
          <span className="text-xs text-muted-foreground">{filters.minRating > 0 ? `${filters.minRating}★` : "Любой"}</span>
        </div>
        <Slider
          value={[filters.minRating]}
          min={0}
          max={5}
          step={0.5}
          onValueChange={(v) => setFilters((f) => ({ ...f, minRating: v[0] }))}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Минимум проектов</Label>
        <Input
          type="number"
          min={0}
          value={filters.minProjects}
          onChange={(e) => setFilters((f) => ({ ...f, minProjects: Number(e.target.value) || 0 }))}
        />
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
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Каталог подростков</h1>
            <p className="mt-1 text-sm text-muted-foreground">{filtered.length} из {items.length} профилей</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Имя, навык, описание..."
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                className="pl-8"
              />
            </div>
            <Select value={filters.sort} onValueChange={(v) => setFilters((f) => ({ ...f, sort: v as SortKey }))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">По рейтингу</SelectItem>
                <SelectItem value="projects">По проектам</SelectItem>
                <SelectItem value="rate_low">Дешевле</SelectItem>
                <SelectItem value="rate_high">Дороже</SelectItem>
                <SelectItem value="recent">Новые</SelectItem>
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
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Bot className="size-4 text-primary" /> AI-подбор подростков
          </div>
          <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {AI_MATCH_BOTS.map((bot) => (
              <button
                key={bot.id}
                type="button"
                onClick={() => setSelectedBot(bot.id)}
                className={`rounded-lg border p-3 text-left transition ${selectedBot === bot.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"}`}
              >
                <div className="text-sm font-medium">{bot.name}</div>
                <div className="text-xs text-muted-foreground">{bot.quality}</div>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Textarea
              rows={3}
              placeholder="Ищу подростка для футбольной команды, нужен нападающий 14-16 лет из моего города... или художник для школьного медиа..."
              value={consumerBrief}
              onChange={(e) => setConsumerBrief(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={aiMatch} disabled={aiMatching}>
                {aiMatching ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Найти подходящих подростков
              </Button>
              {matchIds && (
                <Button variant="ghost" onClick={() => { setMatchIds(null); setAiOrder({}); setMatchReasons({}); }}>
                  Сбросить AI-подбор
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-5">
              {filtersPanel}
            </div>
          </aside>
          <div>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-56 animate-pulse rounded-2xl border border-border bg-card p-5" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  {matchIds ? "По вашему запросу подходящих подростков пока не найдено." : "По выбранным фильтрам подростки не найдены."}
                </p>
                <Button variant="link" onClick={reset}>Сбросить фильтры</Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p) => (
                  <div key={p.id} className="space-y-2">
                    <FreelancerCard p={p} onMessage={message} selfId={user?.id} onBoosted={loadTalents} />
                    {p.id && matchReasons[p.id]?.length > 0 && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">AI-подбор: {aiOrder[p.id]}/100</div>
                        {matchReasons[p.id].slice(0, 3).join(" · ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
