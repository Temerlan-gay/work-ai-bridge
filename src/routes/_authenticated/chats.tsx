import { createFileRoute, Outlet, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Flame, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chats")({
  component: ChatsLayout,
});

type ChatRow = {
  id: string;
  other: { id: string; full_name: string | null; avatar_url: string | null; nickname: string | null };
  last?: { body: string | null; image_url: string | null; created_at: string } | null;
  streak?: number;
};

function ChatsLayout() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const params = useParams({ strict: false }) as { id?: string };
  const activeId = params.id;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data: chatsData } = await supabase
        .from("chats")
        .select("id, user_a, user_b, created_at")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (!chatsData || cancelled) { setLoading(false); return; }
      const otherIds = chatsData.map((c) => (c.user_a === user.id ? c.user_b : c.user_a));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, nickname, avatar_url")
        .in("id", otherIds);
      const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const { data: streaksData } = await supabase.rpc("get_my_chat_streaks");
      const streakMap = new Map<string, number>(
        (streaksData ?? []).map((s: { chat_id: string; streak: number }) => [s.chat_id, s.streak]),
      );
      // last message per chat
      const rows: ChatRow[] = [];
      for (const c of chatsData) {
        const otherId = c.user_a === user.id ? c.user_b : c.user_a;
        const { data: last } = await supabase
          .from("messages")
          .select("body, image_url, created_at")
          .eq("chat_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        rows.push({
          id: c.id,
          other: pMap.get(otherId) ?? { id: otherId, full_name: null, avatar_url: null, nickname: null },
          last,
          streak: streakMap.get(c.id) ?? 0,
        });
      }
      if (!cancelled) { setChats(rows); setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-7rem)]">
          <aside className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <h2 className="font-semibold">Chats</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading…</div>
              ) : chats.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No conversations yet.</div>
              ) : (
                chats.map((c) => {
                  const name = c.other.full_name || c.other.nickname || "User";
                  const preview = c.last?.body || (c.last?.image_url ? "📷 Photo" : "No messages");
                  return (
                    <Link
                      key={c.id}
                      to="/chats/$id"
                      params={{ id: c.id }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 border-b border-border/60 hover:bg-accent/50 transition",
                        activeId === c.id && "bg-accent",
                      )}
                    >
                      <Avatar className="size-10">
                        <AvatarImage src={c.other.avatar_url ?? undefined} />
                        <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="font-medium text-sm truncate">{name}</div>
                          {c.streak && c.streak > 0 ? (
                            <span
                              className="inline-flex items-center gap-0.5 text-xs font-semibold text-orange-500 shrink-0"
                              title={`Стрик: ${c.streak} ${c.streak === 1 ? "день" : "дн."} подряд оба писали`}
                            >
                              <Flame className="size-3.5 fill-orange-500/20" />
                              {c.streak}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{preview}</div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </aside>
          <section className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}