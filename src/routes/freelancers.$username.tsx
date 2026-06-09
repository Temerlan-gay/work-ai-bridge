import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { openOrCreateChat } from "@/lib/open-chat";
import { toast } from "sonner";
import { isOnline, type FreelancerRow } from "@/components/freelancer-card";
import { Star, Briefcase, MapPin, Clock, MessageSquare, Github, Linkedin, ExternalLink, Bot, Loader2 } from "lucide-react";
import { BoostButton } from "@/components/boost-button";
import { aiReputationScore } from "@/lib/ai/functions";

export const Route = createFileRoute("/freelancers/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — WorkBridge` },
      { name: "description", content: `Freelancer profile of @${params.username} on WorkBridge.` },
    ],
  }),
  component: ProfilePage,
});

type Portfolio = { id: string; title: string; description: string | null; image_url: string | null; link: string | null; technologies: string[] | null; boosted_at: string | null };
type Review = { id: string; rating: number; comment: string | null; created_at: string; from_user: string };

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState<FreelancerRow | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [trustLoading, setTrustLoading] = useState(false);
  const [trustScore, setTrustScore] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("freelancer_directory")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      const row = data as FreelancerRow | null;
      if (!row || !row.id) { setNotFound(true); return; }
      setP(row);
      const { data: prof } = await supabase.from("profiles").select("links").eq("id", row.id).maybeSingle();
      setLinks((prof?.links as any) ?? {});
      const [{ data: items }, { data: revs }] = await Promise.all([
        supabase.from("portfolio_items").select("*").eq("user_id", row.id)
          .order("boosted_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase.from("reviews").select("*").eq("to_user", row.id).order("created_at", { ascending: false }).limit(10),
      ]);
      setPortfolio((items ?? []) as Portfolio[]);
      setReviews((revs ?? []) as Review[]);
    })();
  }, [username]);

  const reloadPortfolio = async () => {
    if (!p) return;
    const { data: items } = await supabase.from("portfolio_items").select("*").eq("user_id", p.id)
      .order("boosted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    setPortfolio((items ?? []) as Portfolio[]);
  };

  const message = async () => {
    if (!p) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (user.id === p.id) { toast.info("This is your profile"); return; }
    try {
      const id = await openOrCreateChat(user.id, p.id);
      if (id) navigate({ to: "/chats/$id", params: { id } });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  const loadTrustScore = async () => {
    if (!p) return;
    setTrustLoading(true);
    try {
      const result = await aiReputationScore({
        data: {
          profile: p as any,
          reviews: reviews as any[],
          projects: [],
        },
      });
      setTrustScore(result);
    } catch (e: any) {
      toast.error(e.message ?? "AI reputation scoring failed");
    } finally {
      setTrustLoading(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-6xl px-4 pt-4"><BackButton /></div>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Profile not found</h1>
          <p className="text-sm text-muted-foreground mt-2">@{username} doesn't exist.</p>
          <Button asChild className="mt-6"><Link to="/freelancers">Browse freelancers</Link></Button>
        </div>
      </div>
    );
  }

  if (!p) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  const online = isOnline(p.last_seen_at);
  const initials = (p.full_name ?? p.username ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pt-4"><BackButton /></div>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative shrink-0">
              <Avatar className="size-28">
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <span
                className={`absolute bottom-1 right-1 block size-5 rounded-full ring-4 ring-card ${online ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                title={online ? "Online" : "Offline"}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{p.full_name ?? p.username}</h1>
                  <p className="text-sm text-muted-foreground">@{p.username}{p.specialization && <span> · {p.specialization}</span>}</p>
                </div>
                <Button onClick={message} disabled={user?.id === p.id}>
                  <MessageSquare className="size-4" /> Message
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {p.avg_rating > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-foreground">{p.avg_rating.toFixed(1)}</span>
                    <span>({p.reviews_count} reviews)</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1"><Briefcase className="size-4" /> {p.completed_projects} projects</span>
                {p.country && <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{p.country}{p.city && `, ${p.city}`}</span>}
                {p.years_experience != null && <span className="inline-flex items-center gap-1"><Clock className="size-4" />{p.years_experience}y experience</span>}
                {p.hourly_rate != null && <span className="font-medium text-foreground">${Number(p.hourly_rate).toFixed(0)}/hr</span>}
              </div>
              {(links.github || links.linkedin) && (
                <div className="mt-3 flex gap-2">
                  {links.github && (
                    <Button asChild variant="outline" size="sm">
                      <a href={links.github.startsWith("http") ? links.github : `https://github.com/${links.github}`} target="_blank" rel="noopener noreferrer">
                        <Github className="size-4" /> GitHub
                      </a>
                    </Button>
                  )}
                  {links.linkedin && (
                    <Button asChild variant="outline" size="sm">
                      <a href={links.linkedin} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="size-4" /> LinkedIn
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {p.bio && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold mb-2">About</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.bio}</p>
            </div>
          )}

          {p.skills && p.skills.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold mb-2">Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {p.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-lg border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Bot className="size-4 text-primary" /> AI trust score
                </h2>
                <p className="text-xs text-muted-foreground">Based on reviews, completion, activity, and visible profile signals.</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadTrustScore} disabled={trustLoading}>
                {trustLoading ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
                Analyze
              </Button>
            </div>
            {trustScore && (
              <div className="mt-3 grid gap-3 sm:grid-cols-[100px_1fr]">
                <div className="rounded-md bg-primary/10 p-3 text-center">
                  <div className="text-2xl font-semibold">{trustScore.score}</div>
                  <div className="text-xs text-muted-foreground">{trustScore.grade}</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium">Reasons</div>
                  <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                    {(trustScore.reasons ?? []).map((reason: string) => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {portfolio.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight mb-4">Portfolio</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolio.map((it) => (
                <div key={it.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  {it.image_url && (
                    <img src={it.image_url} alt={it.title} className="w-full aspect-video object-cover" loading="lazy" />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{it.title}</div>
                      {it.boosted_at && Date.now() - new Date(it.boosted_at).getTime() < 7*24*60*60*1000 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-medium shrink-0">★ TOP</span>
                      )}
                    </div>
                    {it.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{it.description}</p>}
                    {it.technologies && it.technologies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {it.technologies.slice(0, 4).map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    )}
                    {it.link && (
                      <a href={it.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        Visit <ExternalLink className="size-3" />
                      </a>
                    )}
                    {user?.id === p.id && (
                      <div className="mt-3">
                        <BoostButton kind="portfolio" id={it.id} boostedAt={it.boosted_at} onBoosted={reloadPortfolio} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {reviews.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight mb-4">Reviews</h2>
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`size-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                    <span className="ml-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
