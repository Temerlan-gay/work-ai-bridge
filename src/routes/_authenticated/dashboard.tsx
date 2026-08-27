import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, Plus, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { MotivationBanner } from "@/components/motivation";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Кабинет - TalentBridge" }] }),
  component: Dashboard,
});

function roleLabel(kind: string | null | undefined) {
  return kind === "client" ? "Потребитель" : "Подросток";
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState({ completed: 0, totalBudget: 0, avg: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (p && !p.onboarded) {
        navigate({ to: "/onboarding" });
        return;
      }
      setProfile(p);
      const { data: pr } = await supabase
        .from("projects")
        .select("*")
        .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(10);
      setProjects(pr ?? []);
      const completed = (pr ?? []).filter((x) => x.status === "completed");
      const totalBudget = completed.reduce((s, x) => s + Number(x.budget ?? 0), 0);
      const { data: revs } = await supabase.from("reviews").select("rating").eq("to_user", user.id);
      const avg = revs && revs.length ? revs.reduce((s, r) => s + r.rating, 0) / revs.length : 0;
      setStats({ completed: completed.length, totalBudget, avg });
    })();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Привет, {profile?.full_name ?? "добро пожаловать"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {roleLabel(profile?.kind)} · {profile?.specialization ?? "направление не указано"} · {profile?.country ?? ""}
            </p>
          </div>
          {profile?.kind === "client" && (
            <Button onClick={() => navigate({ to: "/projects/new" })}>
              <Plus className="size-4" /> Создать возможность
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Завершено проектов" value={stats.completed} />
          <StatCard label="Общий бюджет" value={`$${stats.totalBudget.toFixed(0)}`} />
          <StatCard label="Средний рейтинг" value={`${stats.avg.toFixed(1)} ★`} />
        </div>

        <MotivationBanner />

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Briefcase className="size-4" /> Ваши возможности
            </h2>
            <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground">
              Смотреть все →
            </Link>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет связанных возможностей.</p>
          ) : (
            <ul className="divide-y divide-border">
              {projects.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.category} · {p.status}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {p.budget ? `$${p.budget}` : "по условиям"}
                  </div>
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
      <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1.5 text-2xl font-semibold">
        {label.includes("рейтинг") && <Star className="size-5 text-primary" />}
        {value}
      </div>
    </div>
  );
}
