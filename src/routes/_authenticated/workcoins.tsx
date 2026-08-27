import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Coins, Copy, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workcoins")({
  head: () => ({
    meta: [
      { title: "WorkCoins - TalentBridge" },
      { name: "description", content: "Баланс WorkCoins, продвижение профиля и безопасное пополнение." },
    ],
  }),
  component: WorkCoinsPage,
});

type Tx = { id: string; amount: number; reason: string; created_at: string };

const PAYMENT_CARD = "4400 4302 0076 0566";

const PACKAGES = [
  { id: "s", coins: 50, price: 200, label: "Стартовый" },
  { id: "m", coins: 150, price: 550, label: "Популярный", popular: true, bonus: "+8% бонус" },
  { id: "l", coins: 500, price: 1700, label: "Для активных", bonus: "+18% бонус" },
];

const REASON_LABEL: Record<string, string> = {
  project_posted: "Публикация возможности",
  project_completed: "Завершение возможности",
  boost_project: "Продвижение возможности",
  boost_portfolio: "Продвижение работы в портфолио",
  boost_profile: "Поднятие профиля подростка",
};

function WorkCoinsPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[1]);
  const [payerName, setPayerName] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

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

  const copyCard = async () => {
    await navigator.clipboard.writeText(PAYMENT_CARD.replace(/\s/g, ""));
    toast.success("Номер для перевода скопирован");
  };

  const submitPaymentNotice = () => {
    if (!payerName.trim()) {
      toast.info("Укажите имя отправителя, чтобы платеж было проще проверить.");
      return;
    }

    toast.success("Заявка на пополнение создана", {
      description:
        "После ручной проверки перевода администратор начислит WorkCoins. Данные банковской карты пользователя сайт не хранит.",
    });
    setPaymentNote("");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-all duration-200 hover:shadow-[0_6px_20px_-8px_color-mix(in_oklab,var(--foreground)_22%,transparent)]"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">WorkCoins</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Внутренняя валюта TalentBridge для продвижения профиля и дополнительных возможностей.
            </p>
          </div>
        </div>
        <Card className="flex items-center gap-3 border-amber-200/60 bg-gradient-to-br from-amber-50 to-amber-100 px-5 py-3 dark:border-amber-800/40 dark:from-amber-950/40 dark:to-amber-900/20">
          <Coins className="size-7 text-amber-500" />
          <div>
            <div className="text-xs text-muted-foreground">Баланс</div>
            <div className="text-2xl font-bold leading-none">{balance ?? "-"}</div>
          </div>
        </Card>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">На что тратить</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="flex items-start gap-3 p-4">
            <Rocket className="mt-0.5 size-5 text-primary" />
            <div>
              <div className="font-medium">Поднять профиль подростка вверх</div>
              <div className="text-sm text-muted-foreground">
                За 250 WorkCoins профиль на 7 дней становится выше в списке талантов.
              </div>
            </div>
          </Card>
          <Card className="flex items-start gap-3 p-4">
            <Sparkles className="mt-0.5 size-5 text-primary" />
            <div>
              <div className="font-medium">Выделиться для наставников</div>
              <div className="text-sm text-muted-foreground">
                Продвижение помогает секциям, клубам и организаторам быстрее увидеть подходящего подростка.
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Пополнить WorkCoins</h2>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4 sm:grid-cols-3">
            {PACKAGES.map((p) => (
              <Card
                key={p.id}
                className={`relative flex cursor-pointer flex-col gap-3 p-5 transition-all duration-200 hover:shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--foreground)_28%,transparent)] ${
                  selectedPackage.id === p.id ? "border-primary/70 ring-1 ring-primary/30" : ""
                }`}
                onClick={() => setSelectedPackage(p)}
              >
                {p.popular && (
                  <span className="absolute -top-2 right-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
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
                {p.bonus && <div className="text-xs font-medium text-primary">{p.bonus}</div>}
                <div className="text-xl font-semibold">{p.price} ₽</div>
              </Card>
            ))}
          </div>

          <Card className="space-y-4 p-5">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-5 text-primary" />
              <div>
                <div className="font-medium">Безопасное пополнение</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Сайт не просит номер карты, срок действия или CVV. Для пополнения переведите сумму
                  выбранного пакета на реквизит ниже.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Перевод на карту</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-mono text-sm">{PAYMENT_CARD}</span>
                <Button variant="outline" size="icon" onClick={copyCard}>
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Имя отправителя</Label>
                <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Комментарий или последние 4 цифры перевода</Label>
                <Input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
              </div>
              <Button className="w-full" onClick={submitPaymentNotice}>
                Сообщить о переводе {selectedPackage.price} ₽
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">История</h2>
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

      <section className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
          <Check className="size-4 text-primary" />
          Важно
        </div>
        Автоматическое зачисление денег и прием банковских карт нужно подключать через платежный
        сервис. Текущая версия не хранит платежные данные пользователей.
      </section>
    </div>
  );
}
