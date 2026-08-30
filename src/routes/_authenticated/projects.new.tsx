import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/back-button";
import { SiteHeader } from "@/components/site-header";
import { AiSuggestionReview } from "@/components/ai-suggestion-review";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { aiGenerateProjectDraft, aiPriceEstimator, aiScamDetection } from "@/lib/ai/functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/projects/new")({
  head: () => ({ meta: [{ title: "Новое объявление потребителя - TalentBridge" }] }),
  component: NewOpportunity,
});

function NewOpportunity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [skills, setSkills] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [brief, setBrief] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Record<string, string | number | string[]> | null>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);

  const original = { title, description, skills, budget, deadline };

  const generateDraft = async () => {
    const prompt = brief.trim() || description.trim();
    if (prompt.length < 10) {
      toast.error("Сначала опишите, кто вы и какого подростка ищете.");
      return;
    }
    setAiLoading(true);
    try {
      const draft = await aiGenerateProjectDraft({ data: { brief: prompt, category } });
      setSuggestion({
        title: draft.title,
        description: [
          draft.description,
          draft.requirements.length ? `\nТребования:\n- ${draft.requirements.join("\n- ")}` : "",
          draft.timeline ? `\nСроки: ${draft.timeline}` : "",
        ].join("").trim(),
        skills: draft.skills,
        budget: `${draft.budgetEstimate.min}-${draft.budgetEstimate.max}`,
        deadline,
      });
    } catch (e: any) {
      toast.error(e.message ?? "AI временно не смог создать черновик");
    } finally {
      setAiLoading(false);
    }
  };

  const estimatePrice = async () => {
    setEstimateLoading(true);
    try {
      const result = await aiPriceEstimator({
        data: { project: { title, description, category, skills, budget, deadline } },
      });
      setEstimate(result);
    } catch (e: any) {
      toast.error(e.message ?? "AI временно не смог оценить условия");
    } finally {
      setEstimateLoading(false);
    }
  };

  const checkRisk = async () => {
    setRiskLoading(true);
    try {
      const result = await aiScamDetection({
        data: { contentType: "project", content: { title, description, category, skills, budget, deadline } },
      });
      setRisk(result);
    } catch (e: any) {
      toast.error(e.message ?? "AI временно не смог проверить безопасность");
    } finally {
      setRiskLoading(false);
    }
  };

  const applySuggestion = (next: Record<string, unknown>) => {
    setTitle(String(next.title ?? ""));
    setDescription(String(next.description ?? ""));
    setSkills(Array.isArray(next.skills) ? next.skills.join(", ") : String(next.skills ?? ""));
    setBudget(String(next.budget ?? ""));
    setDeadline(String(next.deadline ?? ""));
    setSuggestion(null);
    toast.success("AI-черновик вставлен. Проверьте его перед публикацией.");
  };

  const submit = async () => {
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      toast.error("Название и описание обязательны.");
      return;
    }
    setSaving(true);
    const parsedBudget = budget.includes("-")
      ? Number(budget.split("-").at(-1)?.trim())
      : Number(budget);
    const { error } = await supabase.from("projects").insert({
      client_id: user.id,
      title: title.trim(),
      description: description.trim(),
      category,
      skills_required: skills.split(",").map((s) => s.trim()).filter(Boolean),
      budget: Number.isFinite(parsedBudget) ? parsedBudget : null,
      deadline: deadline || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Объявление опубликовано");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <BackButton />
      </div>
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <section className="space-y-5 rounded-lg border border-border bg-card p-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Новое объявление о поиске таланта</h1>
            <p className="text-sm text-muted-foreground">
              Расскажите о себе, команде или организации, кого ищете и какие условия готовы предложить подростку.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Кратко: кто вы и кого ищете</Label>
            <Textarea
              rows={3}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Я тренер, 1 год стажа. Набираю подростков 12-15 лет в футбольную команду, готовы платить 25 долларов в месяц..."
            />
          </div>
          <Button variant="outline" onClick={generateDraft} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Помочь оформить объявление
          </Button>

          {suggestion && (
            <AiSuggestionReview
              feature="project_generator"
              targetTable="projects"
              original={original}
              suggested={suggestion}
              onAccept={applySuggestion}
              onReject={() => setSuggestion(null)}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Заголовок объявления</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Тренер ищет футболистов 12-15 лет в команду" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>О себе, команде и условиях</Label>
              <Textarea
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={"Например:\nЯ тренер по футболу, стаж 1 год. У нас команда для подростков, тренировки 3 раза в неделю. Ищем нападающих и вратаря 12-15 лет. Готовы платить 25 долларов в месяц или обсуждать условия лично."}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Сфера</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Каких талантов ищете</Label>
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Футбол, скорость, командная игра, вратарь" />
            </div>
            <div className="space-y-1.5">
              <Label>Готовы платить ($ в месяц)</Label>
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="25" />
            </div>
            <div className="space-y-1.5">
              <Label>До какой даты ищете</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={saving}>{saving ? "Публикуем..." : "Опубликовать объявление"}</Button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <Bot className="size-4 text-primary" /> AI-помощник
            </div>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={estimatePrice} disabled={estimateLoading}>
                {estimateLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Оценить условия
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={checkRisk} disabled={riskLoading}>
                {riskLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Проверить безопасность
              </Button>
            </div>
          </div>

          {estimate && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="font-medium">Оценка условий</div>
              <div className="mt-2 text-2xl font-semibold">${estimate.minBudget}-{estimate.maxBudget}</div>
              <div className="text-muted-foreground">{estimate.minDays}-{estimate.maxDays} дней · {estimate.complexity}</div>
              <p className="mt-2 text-muted-foreground">{estimate.reasoning}</p>
            </div>
          )}

          {risk && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="font-medium">Проверка безопасности: {risk.risk}</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                {(risk.warnings ?? []).map((warning: string) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
