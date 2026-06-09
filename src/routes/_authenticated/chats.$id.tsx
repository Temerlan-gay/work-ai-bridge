import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Send, ArrowLeft, Loader2, Bot, Languages, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { aiChatAssistant } from "@/lib/ai/functions";
import { AiSuggestionReview } from "@/components/ai-suggestion-review";

export const Route = createFileRoute("/_authenticated/chats/$id")({
  component: ChatRoom,
});

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
};

type Profile = { id: string; full_name: string | null; nickname: string | null; avatar_url: string | null };

function ChatRoom() {
  const { id: chatId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPanel, setAiPanel] = useState<any>(null);
  const [composerSuggestion, setComposerSuggestion] = useState<Record<string, string> | null>(null);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Load chat + other profile + messages
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data: chat, error } = await supabase
        .from("chats")
        .select("id, user_a, user_b")
        .eq("id", chatId)
        .maybeSingle();
      if (error || !chat) { toast.error("Chat not found"); navigate({ to: "/chats" }); return; }
      const otherId = chat.user_a === user.id ? chat.user_b : chat.user_a;
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, nickname, avatar_url")
        .eq("id", otherId)
        .maybeSingle();
      if (cancelled) return;
      setOther(prof);
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled) setMessages((msgs ?? []) as Message[]);
    };
    load();
    return () => { cancelled = true; };
  }, [chatId, user, navigate]);

  // Realtime: messages + presence + typing
  useEffect(() => {
    if (!user || !other) return;
    const channel = supabase.channel(`chat:${chatId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOtherOnline(Boolean(state[other.id]?.length));
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id === other.id) {
          setOtherTyping(true);
          window.setTimeout(() => setOtherTyping(false), 2500);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [chatId, user, other]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, otherTyping]);

  const broadcastTyping = useMemo(() => {
    let last = 0;
    return () => {
      const now = Date.now();
      if (now - last < 1500) return;
      last = now;
      supabase.channel(`chat:${chatId}`).send({ type: "broadcast", event: "typing", payload: { user_id: user?.id } });
    };
  }, [chatId, user?.id]);

  const sendMessage = async (body: string | null, image_url: string | null) => {
    if (!user) return;
    if (!body && !image_url) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      chat_id: chatId,
      sender_id: user.id,
      body,
      image_url,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setText("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    await sendMessage(t, null);
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Only images allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploading(true);
    const path = `${user.id}/${chatId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("chat-images").upload(path, file, { cacheControl: "3600" });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("chat-images").getPublicUrl(path);
    await sendMessage(null, pub.publicUrl);
    setUploading(false);
  };

  const otherName = other?.full_name || other?.nickname || "User";

  const runChatAi = async (mode: "reply" | "translate" | "summarize" | "grammar") => {
    setAiLoading(true);
    try {
      const result = await aiChatAssistant({
        data: {
          mode,
          draft: text,
          messages: messages
            .filter((m) => m.body)
            .slice(-40)
            .map((m) => ({ mine: m.sender_id === user?.id, body: m.body ?? "" })),
        },
      });
      setAiPanel({ mode, result });
    } catch (e: any) {
      toast.error(e.message ?? "AI chat assistant failed");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate({ to: "/chats" })}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="relative">
          <Avatar className="size-9">
            <AvatarImage src={other?.avatar_url ?? undefined} />
            <AvatarFallback>{otherName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className={cn(
            "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card",
            otherOnline ? "bg-emerald-500" : "bg-muted-foreground/40",
          )} />
        </div>
        <div className="min-w-0">
          <div className="font-medium leading-tight truncate">{otherName}</div>
          <div className="text-xs text-muted-foreground">
            {otherTyping ? <span className="text-primary">typing…</span> : (otherOnline ? "Online" : "Offline")}
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot className="size-4 text-primary" /> AI chat assistant
            </div>
            {aiLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => runChatAi("reply")} disabled={aiLoading}>
              <Wand2 className="size-4" /> Replies
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => runChatAi("grammar")} disabled={aiLoading || !text.trim()}>
              Improve grammar
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => runChatAi("translate")} disabled={aiLoading}>
              <Languages className="size-4" /> Translate
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => runChatAi("summarize")} disabled={aiLoading}>
              Summarize
            </Button>
          </div>
          {aiPanel && (
            <div className="mt-3 space-y-2 text-sm">
              {aiPanel.result.summary && <p className="rounded-md bg-muted p-2">{aiPanel.result.summary}</p>}
              {aiPanel.result.translation && <p className="rounded-md bg-muted p-2">{aiPanel.result.translation}</p>}
              {aiPanel.result.improved && (
                <button
                  type="button"
                  className="block w-full rounded-md bg-muted p-2 text-left hover:bg-muted/80"
                  onClick={() => setComposerSuggestion({ message: aiPanel.result.improved })}
                >
                  {aiPanel.result.improved}
                </button>
              )}
              {(aiPanel.result.suggestions ?? []).map((s: string) => (
                <button
                  key={s}
                  type="button"
                  className="block w-full rounded-md bg-muted p-2 text-left hover:bg-muted/80"
                  onClick={() => setComposerSuggestion({ message: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {composerSuggestion && (
            <div className="mt-3">
              <AiSuggestionReview
                feature="chat_assistant"
                targetTable="messages"
                targetId={chatId}
                original={{ message: text }}
                suggested={composerSuggestion}
                onAccept={(next) => {
                  setText(String(next.message ?? ""));
                  setComposerSuggestion(null);
                }}
                onReject={() => setComposerSuggestion(null)}
              />
            </div>
          )}
        </div>
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md",
              )}>
                {m.image_url && (
                  <a href={m.image_url} target="_blank" rel="noreferrer">
                    <img src={m.image_url} alt="" className="rounded-lg max-h-64 mb-1" />
                  </a>
                )}
                {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                <div className={cn("text-[10px] mt-1 opacity-70", mine ? "text-right" : "text-left")}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2 text-xs text-muted-foreground inline-flex gap-1">
              <span className="size-1.5 rounded-full bg-current animate-bounce" />
              <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:120ms]" />
              <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:240ms]" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-border p-3 flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
        <Button type="button" variant="ghost" size="icon" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        </Button>
        <Input
          value={text}
          onChange={(e) => { setText(e.target.value); broadcastTyping(); }}
          placeholder="Write a message…"
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={sending || !text.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </>
  );
}
