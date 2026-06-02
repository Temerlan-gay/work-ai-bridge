import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { X, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects/new")({
  head: () => ({ meta: [{ title: "About me — WorkBridge" }] }),
  component: AboutMe,
});

type WorkItem = { id?: string; url: string; path: string; title: string; description: string };

function AboutMe() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [saving, setSaving] = useState(false);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("specialization, bio, skills").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setHeadline(data.specialization ?? "");
        setBio(data.bio ?? "");
        setSkills((data.skills ?? []).join(", "));
      }
    });
  }, [user]);

  const onFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    const uploaded: WorkItem[] = [];
    for (const file of Array.from(files)) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("portfolio").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from("portfolio").getPublicUrl(path);
      uploaded.push({ url: data.publicUrl, path, title: "", description: "" });
    }
    setWorks((prev) => [...prev, ...uploaded]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeWork = async (idx: number) => {
    const w = works[idx];
    await supabase.storage.from("portfolio").remove([w.path]);
    setWorks((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateWork = (idx: number, patch: Partial<WorkItem>) => {
    setWorks((prev) => prev.map((w, i) => (i === idx ? { ...w, ...patch } : w)));
  };

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    const { error: profileErr } = await supabase.from("profiles").update({
      specialization: headline || null,
      bio: bio || null,
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
    }).eq("id", user.id);

    let portfolioErr: { message: string } | null = null;
    if (works.length > 0) {
      const rows = works.map((w) => ({
        user_id: user.id,
        title: w.title || "Untitled work",
        description: w.description || null,
        image_url: w.url,
      }));
      const { error } = await supabase.from("portfolio_items").insert(rows);
      if (error) portfolioErr = error;
    }
    setSaving(false);
    if (profileErr) { toast.error(profileErr.message); return; }
    if (portfolioErr) { toast.error(portfolioErr.message); return; }
    toast.success("Profile saved");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">About me</h1>
          <p className="text-sm text-muted-foreground mt-1">Tell people who you are, what you do, and showcase your work.</p>
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="space-y-1.5">
            <Label>Headline</Label>
            <Input placeholder="e.g. Fullstack Developer · React, Node.js" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>About you</Label>
            <Textarea rows={6} placeholder="Describe yourself, your experience and qualities" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Skills (comma-separated)</Label>
            <Input placeholder="React, TypeScript, Figma" value={skills} onChange={(e) => setSkills(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Photos of your work</Label>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="size-4 mr-2" />{uploading ? "Uploading..." : "Upload images"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </div>
            {works.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {works.map((w, idx) => (
                  <div key={w.path} className="relative rounded-lg overflow-hidden border border-border bg-background">
                    <div className="relative aspect-video">
                      <img src={w.url} alt={w.title || "work"} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeWork(idx)}
                        className="absolute top-1 right-1 rounded-full bg-background/90 p-1 hover:bg-background"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                    <div className="p-2 space-y-2">
                      <Input
                        placeholder="Title"
                        value={w.title}
                        onChange={(e) => updateWork(idx, { title: e.target.value })}
                      />
                      <Textarea
                        rows={2}
                        placeholder="Short description (optional)"
                        value={w.description}
                        onChange={(e) => updateWork(idx, { description: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={submit} disabled={saving || (!headline && !bio && works.length === 0)}>
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </main>
    </div>
  );
}