import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — WorkBridge" }] }),
  component: ProjectsBrowse,
});

function ProjectsBrowse() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");

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

  const filtered = items.filter((p) => !q || p.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pt-4"><BackButton /></div>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-6">Open projects</h1>
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