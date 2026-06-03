import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Coins, Sparkles, Check, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workcoins")({
  head: () => ({
    meta: [
      { title: "WorkCoins — WorkBridge" },
      { name: "description", content: "Ваш баланс WorkCoins и магазин монет." },
    ],
  }),
  component: WorkCoinsPage,
});

type Tx = { id: string; amount: number; reason: string; created_at: string };

const PACKAGES = [
  { id: "s", coins: 50, price: 200, label: "Стартовый" },
  { id: "m", coins: 150, price: 550, label: "Популярный", popular: true, bonus: "+8% бонус" },
  { id: "l", coins: 500, price: 1700, label: "Выгодный", bonus: "+18% бонус" },
];

const REASON_LABEL: Record<string, string> = {
  project_posted: "Публикация проекта",
  project_completed: "Завершение проекта",
};

function WorkCoinsPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const [{ data: wallet }, { data: history }] = await Promise.all([
        (supabase as any).from("workcoin_wallets").select("balance").eq("user_id", user.id).maybeSingle(),
        (supabase as any)
          .from("workcoin_transactions")
          .select("id, amount, reason, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (cancelled) return;
      setBalance(wallet?.balance ?? 0);
      setTxs((history as Tx[]) ?? []);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleBuy = (coins: number, price: number) => {
    toast.info("Оплата скоро будет доступна", {
      description: `Пакет ${coins} монет за ${price} ₸ появится после подключения платежей.`,
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center size-9 rounded-lg border border-border bg-background text-foreground hover:shadow-[0_6px_20px_-8px_color-mix(in_oklab,var(--foreground)_22%,transparent)] transition-all duration-200"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">WorkCoins</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Монеты за активность — обменивайте на плюшки внутри платформы.
            </p>
          </div>
        </div>
        <Card className="px-5 py-3 flex items-center gap-3 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200/60 dark:border-amber-800/40">
          <Coins className="size-7 text-amber-500" />
          <div>
            <div className="text-xs text-muted-foreground">Баланс</div>
            <div className="text-2xl font-bold leading-none">{balance ?? "—"}</div>
          </div>
        </Card>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">Как заработать</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Card className="p-4 flex items-start gap-3">
            <Check className="size-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Опубликовать проект</div>
              <div className="text-sm text-muted-foreground">+50 монет за каждый новый проект</div>
            </div>
          </Card>
          <Card className="p-4 flex items-start gap-3">
            <Check className="size-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Сдать работу</div>
              <div className="text-sm text-muted-foreground">+50 монет при завершении проекта</div>
            </div>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Купить монеты</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {PACKAGES.map((p) => (
            <Card
              key={p.id}
              className={`p-5 flex flex-col gap-3 relative transition-all duration-200 hover:shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--foreground)_28%,transparent)] ${
                p.popular ? "border-primary/60 ring-1 ring-primary/30" : ""
              }`}
            >
              {p.popular && (
                <span className="absolute -top-2 right-4 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">
                  Хит
                </span>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4" />
                {p.label}
              </div>
              <div className="flex items-baseline gap-2">
                <Coins className="size-6 text-amber-500" />
                <span className="text-3xl font-bold">{p.coins}</span>
                <span className="text-sm text-muted-foreground">монет</span>
              </div>
              {p.bonus && <div className="text-xs text-primary font-medium">{p.bonus}</div>}
              <div className="text-xl font-semibold">{p.price} ₸</div>
              <Button onClick={() => handleBuy(p.coins, p.price)} className="mt-auto">
                Купить
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">История</h2>
        {txs.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Пока пусто</Card>
        ) : (
          <Card className="divide-y divide-border">
            {txs.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{REASON_LABEL[t.reason] ?? t.reason}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold ${
                    t.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                  }`}
                >
                  {t.amount >= 0 ? "+" : ""}
                  {t.amount}
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}