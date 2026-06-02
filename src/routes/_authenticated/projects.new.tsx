import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects/new")({
  head: () => ({ meta: [{ title: "New project — WorkBridge" }] }),
  component: NewProject,
});

function NewProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase.from("projects").insert({
      client_id: user.id, title, description, category,
      budget: budget ? Number(budget) : null,
      deadline: deadline || null,
    }).select().single();
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Project posted"); navigate({ to: "/projects/$id", params: { id: data.id } }); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Post a project</h1>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Budget ($)</Label><Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Deadline</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
          </div>
          <Button onClick={submit} disabled={saving || !title || !description}>{saving ? "Posting..." : "Post project"}</Button>
        </div>
      </main>
    </div>
  );
}