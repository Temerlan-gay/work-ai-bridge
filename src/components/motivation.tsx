import { useMemo } from "react";
import motivationWork from "@/assets/motivation-work.jpg";
import motivationClimb from "@/assets/motivation-climb.jpg";

export const MOTIVATIONS = [
  "Не время сидеть — время брать заказ 🔥",
  "Каждый проект — шаг к свободе",
  "Сделал работу — получил коины 💰",
  "Лучший момент начать — сейчас",
  "Твой следующий клиент уже ищет тебя",
  "Дисциплина бьёт мотивацию. Но обе у тебя есть.",
  "Маленькие шаги → большие чеки",
  "Кофе ☕, ноут 💻, погнали",
];

export function MotivationBanner({ variant = "work" }: { variant?: "work" | "climb" }) {
  const quote = useMemo(() => MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)], []);
  const img = variant === "climb" ? motivationClimb : motivationWork;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid md:grid-cols-2 gap-0 items-center">
        <div className="p-6 md:p-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Минутка мотивации</div>
          <p className="text-xl md:text-2xl font-semibold leading-snug">{quote}</p>
          <p className="mt-3 text-sm text-muted-foreground">Открой проект, ответь клиенту, заверши задачу — и +50 WorkCoins твои.</p>
        </div>
        <div className="relative h-48 md:h-56">
          <img src={img} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        </div>
      </div>
    </div>
  );
}

export function MotivationStrip() {
  return (
    <div className="rounded-xl border border-border bg-accent/30 px-4 py-3 text-sm text-center text-muted-foreground">
      <span className="text-foreground font-medium">Не время сидеть</span> — лучшие проекты разбирают первыми ✨
    </div>
  );
}