import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { useAuth } from "@/hooks/use-auth";
import { aiNaturalLanguageSearch, aiProjectFeed } from "@/lib/ai/functions";
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
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [aiOrder, setAiOrder] = useState<Record<string, number>>({});

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
    .sort((a, b) => (aiOrder[b.id] ?? 0) - (aiOrder[a.id] ?? 0));

  const aiSearch = async () => {
    if (aiQuery.trim().length < 2) return;
    setAiLoading(true);
    try {
      const parsed = await aiNaturalLanguageSearch({ data: { query: aiQuery, mode: "projects" } });
      setQ(parsed.query ?? aiQuery);
      if (parsed.category) setCat(parsed.category);
      toast.success("AI converted your search into filters");
    } catch (e: any) {
      toast.error(e.message ?? "AI search failed");
    } finally {
      setAiLoading(false);
    }
  };

  const personalizeFeed = async () => {
    if (!user) {
      toast.info("Log in to personalize your project feed");
      return;
    }
    setFeedLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const result = await aiProjectFeed({
        data: {
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
          behavior: {},
        },
      });
      const next: Record<string, number> = {};
      for (const row of result.rankings ?? []) next[row.id] = row.score;
      setAiOrder(next);
      toast.success("AI personalized your feed");
    } catch (e: any) {
      toast.error(e.message ?? "AI feed failed");
    } finally {
      setFeedLoading(false);
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
            <Bot className="size-4 text-primary" /> AI project discovery
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Need a React developer for an e-commerce website"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
            />
            <Button variant="outline" onClick={aiSearch} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              AI search
            </Button>
            <Button variant="outline" onClick={personalizeFeed} disabled={feedLoading}>
              {feedLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              For you
            </Button>
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
          <p className="text-sm text-muted-foreground">No projects match your search.</p>
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
                <div className="mt-3 text-sm font-medium text-primary">${p.budget ?? 0}</div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
