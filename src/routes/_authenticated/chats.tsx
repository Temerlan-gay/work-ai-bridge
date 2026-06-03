import { createFileRoute, Outlet, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Flame, MessageSquare, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chats")({
  component: ChatsLayout,
});

type ChatRow = {
  id: string;
  other: { id: string; full_name: string | null; avatar_url: string | null; nickname: string | null };
  last?: { body: string | null; image_url: string | null; created_at: string } | null;
  streak?: number;
  can_restore?: boolean;
};

function ChatsLayout() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoresLeft, setRestoresLeft] = useState<number>(0);
  const [restoringId, setRestoringId] = useState<string | null>(null);
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
      const streakMap = new Map<
        string,
        { streak: number; can_restore: boolean }
      >(
        (streaksData ?? []).map(
          (s: { chat_id: string; streak: number; can_restore: boolean }) => [
            s.chat_id,
            { streak: s.streak, can_restore: s.can_restore },
          ],
        ),
      );
      const { data: leftData } = await supabase.rpc("get_streak_restores_left");
      if (!cancelled) setRestoresLeft(typeof leftData === "number" ? leftData : 0);
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
        const info = streakMap.get(c.id);
        rows.push({
          id: c.id,
          other: pMap.get(otherId) ?? { id: otherId, full_name: null, avatar_url: null, nickname: null },
          last,
          streak: info?.streak ?? 0,
          can_restore: info?.can_restore ?? false,
        });
      }
      if (!cancelled) { setChats(rows); setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  const handleRestore = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (restoringId) return;
    setRestoringId(chatId);
    const { data, error } = await supabase.rpc("restore_streak", { p_chat_id: chatId });
    setRestoringId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.success) {
      toast.error(result?.message ?? "Не удалось восстановить");
      return;
    }
    toast.success(result.message ?? "Стрик восстановлен");
    setRestoresLeft(result.restores_left ?? 0);
    // refresh streaks
    const { data: streaksData } = await supabase.rpc("get_my_chat_streaks");
    const streakMap = new Map<string, { streak: number; can_restore: boolean }>(
      (streaksData ?? []).map(
        (s: { chat_id: string; streak: number; can_restore: boolean }) => [
          s.chat_id,
          { streak: s.streak, can_restore: s.can_restore },
        ],
      ),
    );
    setChats((prev) =>
      prev.map((c) => {
        const info = streakMap.get(c.id);
        return { ...c, streak: info?.streak ?? 0, can_restore: info?.can_restore ?? false };
      }),
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-7rem)]">
          <aside className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <h2 className="font-semibold flex-1">Chats</h2>
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                title={`Осталось восстановлений стрика в этом месяце: ${restoresLeft} из 3`}
              >
                <RotateCcw className="size-3" />
                {restoresLeft}/3
              </span>
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
                          {!c.streak && c.can_restore ? (
                            <button
                              onClick={(e) => handleRestore(e, c.id)}
                              disabled={restoringId === c.id || restoresLeft <= 0}
                              className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 disabled:opacity-50 shrink-0"
                              title={
                                restoresLeft > 0
                                  ? `Восстановить стрик (${restoresLeft} осталось)`
                                  : "Восстановления на этот месяц закончились"
                              }
                            >
                              <RotateCcw className="size-3" />
                              {restoringId === c.id ? "..." : "Восстановить"}
                            </button>
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