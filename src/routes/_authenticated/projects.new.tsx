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
  head: () => ({ meta: [{ title: "New project - WorkBridge" }] }),
  component: NewProject,
});

function NewProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0] ?? "AI Development");
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

  const original = {
    title,
    description,
    skills,
    budget,
    deadline,
  };

  const generateDraft = async () => {
    const prompt = brief.trim() || description.trim();
    if (prompt.length < 10) {
      toast.error("Describe the project idea first");
      return;
    }
    setAiLoading(true);
    try {
      const draft = await aiGenerateProjectDraft({ data: { brief: prompt, category } });
      setSuggestion({
        title: draft.title,
        description: [
          draft.description,
          draft.requirements.length ? `\nRequirements:\n- ${draft.requirements.join("\n- ")}` : "",
          draft.timeline ? `\nTimeline: ${draft.timeline}` : "",
        ].join("").trim(),
        skills: draft.skills,
        budget: `${draft.budgetEstimate.min}-${draft.budgetEstimate.max}`,
        deadline,
      });
    } catch (e: any) {
      toast.error(e.message ?? "AI generation failed");
    } finally {
      setAiLoading(false);
    }
  };

  const estimatePrice = async () => {
    setEstimateLoading(true);
    try {
      const result = await aiPriceEstimator({
        data: {
          project: { title, description, category, skills, budget, deadline },
        },
      });
      setEstimate(result);
    } catch (e: any) {
      toast.error(e.message ?? "AI estimate failed");
    } finally {
      setEstimateLoading(false);
    }
  };

  const checkRisk = async () => {
    setRiskLoading(true);
    try {
      const result = await aiScamDetection({
        data: {
          contentType: "project",
          content: { title, description, category, skills, budget, deadline },
        },
      });
      setRisk(result);
    } catch (e: any) {
      toast.error(e.message ?? "AI risk check failed");
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
    toast.success("AI suggestion inserted into the form. Review it before saving.");
  };

  const submit = async () => {
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
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
    toast.success("Project created");
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
            <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
            <p className="text-sm text-muted-foreground">AI can draft and estimate, but you choose what gets saved.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Quick brief for AI</Label>
            <Textarea rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Need a React developer for an e-commerce website..." />
          </div>
          <Button variant="outline" onClick={generateDraft} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate draft
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
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={8} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Skills</Label>
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, TypeScript" />
            </div>
            <div className="space-y-1.5">
              <Label>Budget ($)</Label>
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="500 or 400-800" />
            </div>
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Create project"}</Button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <Bot className="size-4 text-primary" /> AI controls
            </div>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={estimatePrice} disabled={estimateLoading}>
                {estimateLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Estimate price
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={checkRisk} disabled={riskLoading}>
                {riskLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Check for scams
              </Button>
            </div>
          </div>

          {estimate && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="font-medium">Price estimate</div>
              <div className="mt-2 text-2xl font-semibold">${estimate.minBudget}-{estimate.maxBudget}</div>
              <div className="text-muted-foreground">{estimate.minDays}-{estimate.maxDays} days · {estimate.complexity}</div>
              <p className="mt-2 text-muted-foreground">{estimate.reasoning}</p>
            </div>
          )}

          {risk && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="font-medium">Risk check: {risk.risk}</div>
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
