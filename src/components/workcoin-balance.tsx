import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function WorkCoinBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const { data } = await (supabase as any)
        .from("workcoin_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setBalance(data?.balance ?? 0);
    };

    load();

    const channel = supabase
      .channel(`workcoin-${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "workcoin_wallets", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const next = (payload.new as { balance?: number } | null)?.balance;
          if (typeof next === "number") setBalance(next);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user || balance === null) return null;

  return (
    <Link
      to="/workcoins"
      title="WorkCoins"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-secondary/50 text-sm font-medium transition-all duration-200 hover:shadow-[0_6px_20px_-8px_color-mix(in_oklab,var(--foreground)_22%,transparent)]"
    >
      <Coins className="size-4 text-amber-500" />
      <span>{balance}</span>
    </Link>
  );
}