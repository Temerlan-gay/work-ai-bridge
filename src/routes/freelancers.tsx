import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { openOrCreateChat } from "@/lib/open-chat";
import { toast } from "sonner";
import { getSpecializationIcon } from "@/lib/category-icons";

export const Route = createFileRoute("/freelancers")({
  head: () => ({ meta: [{ title: "Freelancers — WorkBridge" }] }),
  component: Freelancers,
});

function Freelancers() {
  const [items, setItems] = useState<any[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const message = async (otherId: string) => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (user.id === otherId) { toast.info("This is your profile"); return; }
    try {
      const id = await openOrCreateChat(user.id, otherId);
      if (id) navigate({ to: "/chats/$id", params: { id } });
    } catch (e: any) { toast.error(e.message ?? "Failed to open chat"); }
  };
  useEffect(() => {
    supabase.from("profiles").select("*").eq("kind", "freelancer").eq("onboarded", true)
      .order("created_at", { ascending: false }).limit(60)
      .then(({ data }) => setItems(data ?? []));
  }, []);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-6">Freelancers</h1>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No freelancers yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {(p.full_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground">{p.specialization ?? "—"} · {p.country ?? ""}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{p.bio ?? "No bio yet."}</p>
                {p.skills?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.skills.slice(0, 4).map((s: string) => (
                      <span key={s} className="text-xs rounded-full bg-accent text-accent-foreground px-2 py-0.5">{s}</span>
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <Button size="sm" variant="outline" onClick={() => message(p.id)} disabled={user?.id === p.id}>
                    <MessageSquare className="size-4" /> Message
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}