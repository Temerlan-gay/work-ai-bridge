import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Search } from "lucide-react";
import { SKILL_CATALOG } from "@/lib/categories";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

type Skill = { id: string; name: string; category: string | null; is_custom: boolean };

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}

export function SkillMultiSelect({ value, onChange, max = 20 }: Props) {
  const { user } = useAuth();
  const [all, setAll] = useState<Skill[]>([]);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    supabase
      .from("skill_catalog")
      .select("id,name,category,is_custom")
      .order("name")
      .then(({ data }) => {
        if (data && data.length) setAll(data as Skill[]);
        else setAll(SKILL_CATALOG.map((n) => ({ id: n, name: n, category: null, is_custom: false })));
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((s) => !value.includes(s.name) && (!q || s.name.toLowerCase().includes(q))).slice(0, 30);
  }, [all, query, value]);

  const exactMatch = useMemo(
    () => all.some((s) => s.name.toLowerCase() === query.trim().toLowerCase()),
    [all, query],
  );

  const toggle = (name: string) => {
    if (value.includes(name)) onChange(value.filter((v) => v !== name));
    else if (value.length < max) onChange([...value, name]);
  };

  const addCustom = async () => {
    const name = query.trim();
    if (!name || exactMatch) return;
    if (!user) {
      // Allow local-only for unauthenticated flows (register pre-signup)
      if (!value.includes(name) && value.length < max) onChange([...value, name]);
      setQuery("");
      return;
    }
    setAdding(true);
    const { data, error } = await supabase
      .from("skill_catalog")
      .insert({ name, is_custom: true, created_by: user.id, category: "Other" })
      .select("id,name,category,is_custom")
      .single();
    setAdding(false);
    if (error && !error.message.includes("duplicate")) {
      toast.error(error.message);
      return;
    }
    if (data) setAll((prev) => [...prev, data as Skill]);
    if (!value.includes(name) && value.length < max) onChange([...value, name]);
    setQuery("");
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 pr-1">
              {s}
              <button
                type="button"
                onClick={() => toggle(s)}
                className="rounded-full hover:bg-background/60 p-0.5"
                aria-label={`Remove ${s}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills or type to add custom…"
          className="pl-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!exactMatch && query.trim()) addCustom();
            }
          }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
        {filtered.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(s.name)}
            className="text-xs rounded-full border border-border bg-background hover:bg-accent px-2.5 py-1 transition"
          >
            {s.name}
            {s.is_custom && <span className="ml-1 text-muted-foreground">·custom</span>}
          </button>
        ))}
        {query.trim() && !exactMatch && (
          <button
            type="button"
            onClick={addCustom}
            disabled={adding}
            className="text-xs rounded-full border border-dashed border-primary text-primary bg-primary/5 hover:bg-primary/10 px-2.5 py-1 inline-flex items-center gap-1"
          >
            <Plus className="size-3" /> Add "{query.trim()}"
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{value.length}/{max} selected · Can't find it? Type and press Enter to add a custom skill.</p>
    </div>
  );
}