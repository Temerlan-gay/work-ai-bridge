import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { openOrCreateChat } from "@/lib/open-chat";
import { toast } from "sonner";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { COUNTRIES } from "@/lib/categories";
import { SkillMultiSelect } from "@/components/skill-multi-select";
import { FreelancerCard, isOnline, type FreelancerRow } from "@/components/freelancer-card";

export const Route = createFileRoute("/freelancers")({
  head: () => ({
    meta: [
      { title: "Freelancers — WorkBridge" },
      { name: "description", content: "Browse and hire top freelancers by skill, rating, country, and availability." },
    ],
  }),
  component: Freelancers,
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

function Freelancers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<FreelancerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("freelancer_directory")
      .select("*")
      .limit(200)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setItems((data ?? []) as FreelancerRow[]);
        setLoading(false);
      });
  }, []);

  const message = async (otherId: string) => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (user.id === otherId) { toast.info("This is your profile"); return; }
    try {
      const id = await openOrCreateChat(user.id, otherId);
      if (id) navigate({ to: "/chats/$id", params: { id } });
    } catch (e: any) { toast.error(e.message ?? "Failed to open chat"); }
  };

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const cutoff = dateCutoff(filters.registered);
    let out = items.filter((p) => {
      if (q) {
        const hay = `${p.full_name ?? ""} ${p.username ?? ""} ${p.bio ?? ""} ${(p.skills ?? []).join(" ")}`.toLowerCase();
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
      switch (filters.sort) {
        case "rating": return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
        case "rate_low": return (a.hourly_rate ?? Infinity) - (b.hourly_rate ?? Infinity);
        case "rate_high": return (b.hourly_rate ?? -1) - (a.hourly_rate ?? -1);
        case "projects": return (b.completed_projects ?? 0) - (a.completed_projects ?? 0);
        case "recent":
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return out;
  }, [items, filters]);

  const reset = () => setFilters(DEFAULT_FILTERS);
  const activeCount =
    (filters.skills.length ? 1 : 0) +
    (filters.country !== "any" ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.minProjects > 0 ? 1 : 0) +
    (filters.rate[0] !== 0 || filters.rate[1] !== 300 ? 1 : 0) +
    (filters.onlineOnly ? 1 : 0) +
    (filters.availability !== "any" ? 1 : 0) +
    (filters.registered !== "all" ? 1 : 0);

  const FiltersPanel = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Filters</h3>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs">
            <X className="size-3" /> Reset
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Skills</Label>
        <SkillMultiSelect value={filters.skills} onChange={(skills) => setFilters((f) => ({ ...f, skills }))} max={10} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Country</Label>
        <Select value={filters.country} onValueChange={(v) => setFilters((f) => ({ ...f, country: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any country</SelectItem>
            {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Hourly rate</Label>
          <span className="text-xs text-muted-foreground">${filters.rate[0]}–${filters.rate[1]}/hr</span>
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
          <Label className="text-xs">Minimum rating</Label>
          <span className="text-xs text-muted-foreground">{filters.minRating > 0 ? `${filters.minRating}★` : "Any"}</span>
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
        <Label className="text-xs">Min completed projects</Label>
        <Input
          type="number"
          min={0}
          value={filters.minProjects}
          onChange={(e) => setFilters((f) => ({ ...f, minProjects: Number(e.target.value) || 0 }))}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Availability</Label>
        <Select value={filters.availability} onValueChange={(v) => setFilters((f) => ({ ...f, availability: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="not_available">Not available</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Joined</Label>
        <Select value={filters.registered} onValueChange={(v) => setFilters((f) => ({ ...f, registered: v as DateRange }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any time</SelectItem>
            <SelectItem value="week">Last week</SelectItem>
            <SelectItem value="month">Last month</SelectItem>
            <SelectItem value="3months">Last 3 months</SelectItem>
            <SelectItem value="year">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <Label className="text-xs">Online now</Label>
          <p className="text-[11px] text-muted-foreground">Active in the last 5 min</p>
        </div>
        <Switch checked={filters.onlineOnly} onCheckedChange={(v) => setFilters((f) => ({ ...f, onlineOnly: v }))} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Find Freelancers</h1>
            <p className="text-sm text-muted-foreground mt-1">{filtered.length} of {items.length} freelancers</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search name, skill, bio…"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                className="pl-8"
              />
            </div>
            <Select value={filters.sort} onValueChange={(v) => setFilters((f) => ({ ...f, sort: v as SortKey }))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Top rated</SelectItem>
                <SelectItem value="projects">Most projects</SelectItem>
                <SelectItem value="rate_low">Price: low</SelectItem>
                <SelectItem value="rate_high">Price: high</SelectItem>
                <SelectItem value="recent">Newest</SelectItem>
              </SelectContent>
            </Select>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden relative">
                  <SlidersHorizontal className="size-4" />
                  {activeCount > 0 && (
                    <span className="absolute -top-1 -right-1 size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">{activeCount}</span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[340px] overflow-y-auto">
                <div className="pt-6">{FiltersPanel}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-5">
              {FiltersPanel}
            </div>
          </aside>
          <div>
            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse h-56" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <p className="text-sm text-muted-foreground">No freelancers match your filters.</p>
                <Button variant="link" onClick={reset}>Clear filters</Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((p) => (
                  <FreelancerCard key={p.id} p={p} onMessage={message} selfId={user?.id} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}