import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { openOrCreateChat } from "@/lib/open-chat";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({ meta: [{ title: "Project — WorkBridge" }] }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [cover, setCover] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("7");

  useEffect(() => {
    supabase.from("projects").select("*").eq("id", id).maybeSingle().then(({ data }) => setProject(data));
  }, [id]);

  const submit = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    const { error } = await supabase.from("proposals").insert({
      project_id: id, freelancer_id: user.id, cover_letter: cover,
      price: Number(price), delivery_days: Number(days),
    });
    if (error) toast.error(error.message);
    else toast.success("Proposal sent");
  };

  const messageClient = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (!project?.client_id || user.id === project.client_id) return;
    try {
      const chatId = await openOrCreateChat(user.id, project.client_id);
      if (chatId) navigate({ to: "/chats/$id", params: { id: chatId } });
    } catch (e: any) { toast.error(e.message ?? "Failed to open chat"); }
  };

  if (!project) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-8 text-muted-foreground">Loading…</div></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="text-xs text-muted-foreground">{project.category}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{project.title}</h1>
        <div className="text-sm text-muted-foreground">Budget: <span className="text-foreground font-medium">${project.budget ?? 0}</span> · Deadline: {project.deadline ?? "—"}</div>
        <p className="whitespace-pre-wrap text-foreground/90">{project.description}</p>

        {user && user.id !== project.client_id && (
          <Button variant="outline" onClick={messageClient}>
            <MessageSquare className="size-4" /> Message client
          </Button>
        )}

        {user && user.id !== project.client_id && project.status === "open" && (
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Send a proposal</h2>
            <div className="space-y-1.5"><Label>Cover letter</Label><Textarea rows={4} value={cover} onChange={(e) => setCover(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Your price ($)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Delivery (days)</Label><Input type="number" value={days} onChange={(e) => setDays(e.target.value)} /></div>
            </div>
            <Button onClick={submit}>Send proposal</Button>
          </section>
        )}
      </main>
    </div>
  );
}