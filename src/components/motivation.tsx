import { Target } from "lucide-react";

export function MotivationBanner() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Target className="size-4 text-primary" />
        Цель платформы
      </div>
      <p className="text-xl md:text-2xl font-semibold leading-snug">
        Помочь подросткам стать заметными: показать талант, найти наставника, попасть в команду,
        секцию, конкурс или реальный проект.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        WorkCoins остаются внутренней валютой платформы: их можно тратить на продвижение профиля и
        дополнительные возможности.
      </p>
    </div>
  );
}

export function MotivationStrip() {
  return (
    <div className="rounded-xl border border-border bg-accent/30 px-4 py-3 text-sm text-center text-muted-foreground">
      <span className="text-foreground font-medium">
        Один сильный профиль может помочь подростку получить шанс, который раньше его просто не находил.
      </span>
    </div>
  );
}
