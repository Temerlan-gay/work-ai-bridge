import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { BoostButton } from "@/components/boost-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { openOrCreateChat } from "@/lib/open-chat";
import { toast } from "sonner";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({ meta: [{ title: "Объявление потребителя - TalentBridge" }] }),
  component: OpportunityDetail,
});

function OpportunityDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [cover, setCover] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("7");

  const reload = () => {
    supabase.from("projects").select("*").eq("id", id).maybeSingle().then(({ data }) => setProject(data));
  };

  useEffect(() => {
    reload();
  }, [id]);

  const submit = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    const { error } = await supabase.from("proposals").insert({
      project_id: id,
      freelancer_id: user.id,
      cover_letter: cover,
      price: Number(price),
      delivery_days: Number(days),
    });
    if (error) toast.error(error.message);
    else toast.success("Заявка отправлена");
  };

  const messageOrganizer = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!project?.client_id || user.id === project.client_id) return;
    try {
      const chatId = await openOrCreateChat(user.id, project.client_id);
      if (chatId) navigate({ to: "/chats/$id", params: { id: chatId } });
    } catch (e: any) {
      toast.error(e.message ?? "Не удалось открыть чат");
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-8 text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pt-4"><BackButton /></div>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="text-xs text-muted-foreground">{project.category}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{project.title}</h1>
        <div className="text-sm text-muted-foreground">
          Готовы платить:{" "}
          <span className="font-medium text-foreground">
            {project.budget ? `$${project.budget}/мес` : "по договоренности"}
          </span>{" "}
          · Ищут до: {project.deadline ?? "дата не указана"}
        </div>
        <p className="whitespace-pre-wrap text-foreground/90">{project.description}</p>

        {user && user.id !== project.client_id && (
          <Button variant="outline" onClick={messageOrganizer}>
            <MessageSquare className="size-4" /> Написать потребителю
          </Button>
        )}

        {user && user.id === project.client_id && (
          <div className="flex items-center gap-3">
            <BoostButton kind="project" id={project.id} boostedAt={project.boosted_at} onBoosted={reload} />
            {project.boosted_at && Date.now() - new Date(project.boosted_at).getTime() < 7 * 24 * 60 * 60 * 1000 && (
              <span className="text-xs text-muted-foreground">В топе с {new Date(project.boosted_at).toLocaleDateString()}</span>
            )}
          </div>
        )}

        {user && user.id !== project.client_id && project.status === "open" && (
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold">Откликнуться на объявление</h2>
            <div className="space-y-1.5">
              <Label>Почему вы подходите</Label>
              <Textarea rows={4} value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Расскажите о себе, опыте, возрасте, городе и почему вам интересно это предложение." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Желаемая оплата ($/мес)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Через сколько дней готовы начать</Label>
                <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
              </div>
            </div>
            <Button onClick={submit}>Отправить отклик</Button>
          </section>
        )}
      </main>
    </div>
  );
}
