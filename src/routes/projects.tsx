import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { useAuth } from "@/hooks/use-auth";
import { aiProjectMatching } from "@/lib/ai/functions";
import { AI_MATCH_BOTS, type AiMatchBotId } from "@/lib/ai/bots";
import { toast } from "sonner";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — WorkBridge" }] }),
  component: ProjectsBrowse,
});

function ProjectsBrowse() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [matchRequest, setMatchRequest] = useState("");
  const [selectedBot, setSelectedBot] = useState<AiMatchBotId>("tech_lead");
  const [matchLoading, setMatchLoading] = useState(false);
  const [aiOrder, setAiOrder] = useState<Record<string, number>>({});
  const [matchIds, setMatchIds] = useState<string[] | null>(null);
  const [matchReasons, setMatchReasons] = useState<Record<string, string[]>>({});

  useEffect(() => {
    (async () => {
      let query = supabase
        .from("projects")
        .select("*")
        .eq("status", "open")
        .order("boosted_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (cat && cat !== "all") query = query.eq("category", cat);
      const { data } = await query;
      setItems(data ?? []);
    })();
  }, [cat]);

  const filtered = items
    .filter((p) => !q || `${p.title} ${p.description} ${(p.skills_required ?? []).join(" ")}`.toLowerCase().includes(q.toLowerCase()))
    .filter((p) => !matchIds || matchIds.includes(p.id))
    .sort((a, b) => (aiOrder[b.id] ?? 0) - (aiOrder[a.id] ?? 0));

  const findProjects = async () => {
    if (!user) {
      toast.info("Log in to use the AI vacancy matcher");
      return;
    }
    if (matchRequest.trim().length < 5) {
      toast.info("Describe your skills, budget, and preferred work first");
      return;
    }
    setMatchLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const result = await aiProjectMatching({
        data: {
          request: matchRequest,
          profile: profile ?? {},
          projects: items.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            category: p.category,
            skills_required: p.skills_required,
            budget: p.budget,
            created_at: p.created_at,
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
      if (ids.length === 0) toast.info("По вашему запросу у нас пока нет подходящих вакансий");
      else toast.success("AI found matching projects");
    } catch (e: any) {
      toast.error(e.message ?? "AI project matching failed");
    } finally {
      setMatchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pt-4"><BackButton /></div>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-6">Open projects</h1>
        <div className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Bot className="size-4 text-primary" /> AI vacancy matcher for freelancers
          </div>
          <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
              placeholder="Я React/Python/JS разработчик, хочу проект на e-commerce, бюджет от $800, срок до 2 недель..."
              value={matchRequest}
              onChange={(e) => setMatchRequest(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={findProjects} disabled={matchLoading}>
                {matchLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Find matching vacancies
              </Button>
              {matchIds && (
                <Button variant="ghost" onClick={() => { setMatchIds(null); setAiOrder({}); setMatchReasons({}); }}>
                  Clear AI match
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mb-6">
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {matchIds ? "По вашему запросу у нас пока нет подходящих вакансий." : "No projects match your filters."}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Link key={p.id} to="/projects/$id" params={{ id: p.id }} className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                  <span>{p.category}</span>
                  {p.boosted_at && Date.now() - new Date(p.boosted_at).getTime() < 7*24*60*60*1000 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-medium">★ TOP</span>
                  )}
                </div>
                <div className="font-medium mb-1 line-clamp-2">{p.title}</div>
                <div className="text-sm text-muted-foreground line-clamp-3">{p.description}</div>
                {matchReasons[p.id]?.length > 0 && (
                  <div className="mt-3 rounded-md bg-primary/5 p-2 text-xs text-muted-foreground">
                    <div className="font-medium text-foreground">AI match: {aiOrder[p.id]}/100</div>
                    {matchReasons[p.id].slice(0, 2).join(" · ")}
                  </div>
                )}
                <div className="mt-3 text-sm font-medium text-primary">${p.budget ?? 0}</div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
