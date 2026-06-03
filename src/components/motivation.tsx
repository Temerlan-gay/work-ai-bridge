import { useMemo, useRef } from "react";
import motivationWork from "@/assets/motivation-work.jpg";
import motivationClimb from "@/assets/motivation-climb.jpg";
import motivationRocket from "@/assets/motivation-rocket.jpg";
import motivationCoin from "@/assets/motivation-coin.jpg";
import motivationHighfive from "@/assets/motivation-highfive.jpg";
import motivationPeak from "@/assets/motivation-peak.jpg";

export const MOTIVATIONS = [
  "Не время сидеть — время брать заказ 🔥",
  "Каждый проект — шаг к свободе",
  "Сделал работу — получил коины 💰",
  "Лучший момент начать — сейчас",
  "Твой следующий клиент уже ищет тебя",
  "Дисциплина бьёт мотивацию. Но обе у тебя есть",
  "Маленькие шаги → большие чеки",
  "Кофе ☕, ноут 💻, погнали",
  "Один час фокуса > один день прокрастинации",
  "Сегодня сделай то, за что завтра скажешь спасибо",
  "Откладываешь — теряешь. Берёшь — растёшь 🚀",
  "Скилл качается в работе, а не в туториалах",
  "Лучшее портфолио — то, которое обновляется",
  "Хватит листать ленту — пора писать оффер",
  "Если не ты — то кто-то другой возьмёт этот заказ",
  "Каждый отклик приближает к мечте",
  "Великие проекты начинаются с одного клика",
  "Не идеально, но сделано > идеально, но не начато",
  "Деньги любят действие 💸",
  "Сегодня — лучший день стать собой получше",
  "Фриланс — это не работа, это свобода с дедлайнами",
  "Терпение + действие = результат",
] as const;

const IMAGES = [
  motivationWork,
  motivationClimb,
  motivationRocket,
  motivationCoin,
  motivationHighfive,
  motivationPeak,
] as const;

const STRIPS = [
  "Не время сидеть — лучшие проекты разбирают первыми ✨",
  "Один отклик в день меняет месяц 🚀",
  "Сегодня тот самый день, который ты потом вспомнишь",
  "Заказ сам себя не возьмёт",
  "Кто-то прямо сейчас ищет именно тебя 👀",
  "Маленький шаг сегодня — большой чек завтра",
  "Хватит думать — пора делать 💪",
  "Твой следующий уровень за одним сообщением",
] as const;

// Per-mount unique picks. Each <MotivationBanner /> on the page gets a
// different image + quote, and new picks come on every fresh page load.
const pickedQuotes = new Set<number>();
const pickedImages = new Set<number>();
let pickedStrip = -1;

function uniquePick(used: Set<number>, total: number) {
  if (used.size >= total) used.clear();
  let i = Math.floor(Math.random() * total);
  while (used.has(i)) i = (i + 1) % total;
  used.add(i);
  return i;
}

export function MotivationBanner() {
  // useMemo + ref so SSR + client agree per mount, but each instance is unique
  const ref = useRef<{ q: string; img: string } | null>(null);
  ref.current ||= {
    q: MOTIVATIONS[uniquePick(pickedQuotes, MOTIVATIONS.length)],
    img: IMAGES[uniquePick(pickedImages, IMAGES.length)],
  };
  const { q, img } = ref.current;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid md:grid-cols-2 gap-0 items-center">
        <div className="p-6 md:p-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Минутка мотивации</div>
          <p className="text-xl md:text-2xl font-semibold leading-snug">{q}</p>
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
  const ref = useRef<string | null>(null);
  if (ref.current === null) {
    let i = Math.floor(Math.random() * STRIPS.length);
    if (i === pickedStrip) i = (i + 1) % STRIPS.length;
    pickedStrip = i;
    ref.current = STRIPS[i];
  }
  return (
    <div className="rounded-xl border border-border bg-accent/30 px-4 py-3 text-sm text-center text-muted-foreground">
      <span className="text-foreground font-medium">{ref.current}</span>
    </div>
  );
}