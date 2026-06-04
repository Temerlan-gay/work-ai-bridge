import { useState } from "react";
import { Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  kind: "project" | "portfolio";
  id: string;
  boostedAt?: string | null;
  onBoosted?: () => void;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "secondary";
};

export function BoostButton({ kind, id, boostedAt, onBoosted, size = "sm", variant = "outline" }: Props) {
  const [loading, setLoading] = useState(false);

  const isActive = boostedAt && Date.now() - new Date(boostedAt).getTime() < 7 * 24 * 60 * 60 * 1000;

  const boost = async () => {
    if (loading) return;
    if (!confirm("Поднять в топ за 250 WorkCoins?")) return;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("boost_item", { p_kind: kind, p_id: id });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.success) { toast.error(row?.message ?? "Не удалось"); return; }
    toast.success(row.message ?? "Поднято в топ", { description: `Баланс: ${row.balance}` });
    onBoosted?.();
  };

  return (
    <Button type="button" size={size} variant={variant} onClick={boost} disabled={loading}>
      <Rocket className="size-4" />
      {isActive ? "В топе" : loading ? "..." : "Поднять за 250"}
    </Button>
  );
}