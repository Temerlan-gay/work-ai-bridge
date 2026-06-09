import { useState } from "react";
import { Bot, Check, Edit3, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { logAiConfirmation } from "@/lib/ai/functions";
import type { AiFeature } from "@/lib/ai/schemas";

type FieldMap = Record<string, string | number | string[] | null | undefined>;

interface AiSuggestionReviewProps {
  feature: AiFeature;
  targetTable?: string;
  targetId?: string;
  original: FieldMap;
  suggested: FieldMap;
  onAccept: (suggested: FieldMap) => void;
  onReject?: () => void;
}

function renderValue(value: FieldMap[string]) {
  if (Array.isArray(value)) return value.join(", ");
  if (value == null) return "";
  return String(value);
}

export function AiSuggestionReview({
  feature,
  targetTable,
  targetId,
  original,
  suggested,
  onAccept,
  onReject,
}: AiSuggestionReviewProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FieldMap>(suggested);
  const keys = Array.from(new Set([...Object.keys(original), ...Object.keys(draft)]));

  const logDecision = async (decision: "accepted" | "rejected" | "manual_edit", applied: boolean) => {
    try {
      await logAiConfirmation({
        data: {
          feature,
          targetTable,
          targetId,
          originalContent: original,
          suggestedContent: draft,
          decision,
          applied,
        },
      });
    } catch (e: any) {
      toast.error(e.message ?? "Could not log AI confirmation");
    }
  };

  const accept = async (decision: "accepted" | "manual_edit") => {
    await logDecision(decision, true);
    onAccept(draft);
  };

  const reject = async () => {
    await logDecision("rejected", false);
    onReject?.();
  };

  return (
    <section className="rounded-lg border border-border bg-background p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">AI suggestion review</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
          <Edit3 className="size-4" /> Edit manually
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Original content</div>
          <div className="space-y-2">
            {keys.map((key) => (
              <div key={key} className="rounded-md border border-border p-2">
                <div className="text-[11px] font-medium text-muted-foreground">{key}</div>
                <div className="whitespace-pre-wrap text-sm">{renderValue(original[key]) || "Empty"}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Suggested content</div>
          <div className="space-y-2">
            {keys.map((key) => (
              <div key={key} className="rounded-md border border-primary/30 bg-primary/5 p-2">
                <div className="text-[11px] font-medium text-muted-foreground">{key}</div>
                {editing ? (
                  <Textarea
                    rows={3}
                    value={renderValue(draft[key])}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm">{renderValue(draft[key]) || "Empty"}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border p-3">
        <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Difference</div>
        <div className="space-y-1 text-sm">
          {keys.map((key) => {
            const before = renderValue(original[key]);
            const after = renderValue(draft[key]);
            if (before === after) return null;
            return (
              <div key={key}>
                <span className="font-medium">{key}:</span>{" "}
                <span className="text-red-500 line-through">{before || "Empty"}</span>{" "}
                <span className="text-emerald-600">{after || "Empty"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={reject}>
          <X className="size-4" /> Reject
        </Button>
        <Button onClick={() => accept(editing ? "manual_edit" : "accepted")}>
          <Check className="size-4" /> Accept
        </Button>
      </div>
    </section>
  );
}
