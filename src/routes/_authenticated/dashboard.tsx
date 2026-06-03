import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus, Star } from "lucide-react";
import { MotivationBanner } from "@/components/motivation";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — WorkBridge" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState({ completed: 0, earned: 0, avg: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (p && !p.onboarded) { navigate({ to: "/onboarding" }); return; }
      setProfile(p);
      const { data: pr } = await supabase
        .from("projects").select("*")
        .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
        .order("created_at", { ascending: false }).limit(10);
      setProjects(pr ?? []);
      const completed = (pr ?? []).filter((x) => x.status === "completed");
      const earned = completed.reduce((s, x) => s + Number(x.budget ?? 0), 0);
      const { data: revs } = await supabase.from("reviews").select("rating").eq("to_user", user.id);
      const avg = revs && revs.length ? revs.reduce((s, r) => s + r.rating, 0) / revs.length : 0;
      setStats({ completed: completed.length, earned, avg });
    })();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Hi, {profile?.full_name ?? "there"}</h1>
            <p className="text-muted-foreground text-sm capitalize">{profile?.kind} · {profile?.country ?? ""}</p>
          </div>
          {profile?.kind === "client" && (
            <Button onClick={() => navigate({ to: "/projects/new" })}><Plus className="size-4" /> New project</Button>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Completed projects" value={stats.completed} />
          <StatCard label="Total earned" value={`$${stats.earned.toFixed(0)}`} />
          <StatCard label="Average rating" value={`${stats.avg.toFixed(1)} ★`} />
        </div>

        <MotivationBanner variant="climb" />

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Briefcase className="size-4" /> Your projects</h2>
            <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground">Browse all →</Link>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {projects.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.category} · {p.status}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">${p.budget ?? 0}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-semibold flex items-center gap-1.5">{label.includes("rating") && <Star className="size-5 text-primary" />}{value}</div>
    </div>
  );
}