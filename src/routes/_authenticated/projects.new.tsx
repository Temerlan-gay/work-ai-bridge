import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
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
import { X, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects/new")({
  head: () => ({ meta: [{ title: "About me — WorkBridge" }] }),
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
  const [images, setImages] = useState<{ url: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    const uploaded: { url: string; path: string }[] = [];
    for (const file of Array.from(files)) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("projects").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from("projects").getPublicUrl(path);
      uploaded.push({ url: data.publicUrl, path });
    }
    setImages((prev) => [...prev, ...uploaded]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = async (idx: number) => {
    const img = images[idx];
    await supabase.storage.from("projects").remove([img.path]);
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase.from("projects").insert({
      client_id: user.id, title, description, category,
      budget: budget ? Number(budget) : null,
      deadline: deadline || null,
      attachments: images.map((i) => i.url),
    }).select().single();
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Project posted"); navigate({ to: "/projects/$id", params: { id: data.id } }); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">About me</h1>
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
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div key={img.path} className="relative group rounded-lg overflow-hidden border border-border aspect-square">
                    <img src={img.url} alt="upload" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 rounded-full bg-background/90 p-1 opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={submit} disabled={saving || !title || !description}>{saving ? "Posting..." : "Post project"}</Button>
        </div>
      </main>
    </div>
  );
}