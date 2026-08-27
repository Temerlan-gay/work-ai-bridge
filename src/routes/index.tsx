import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import { ArrowRight, Shield, Sparkles, Star } from "lucide-react";
import { getCategoryIcon } from "@/lib/category-icons";
import { MotivationBanner, MotivationStrip } from "@/components/motivation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TalentBridge - платформа для талантливых школьников" },
      {
        name: "description",
        content:
          "TalentBridge помогает школьникам показать таланты, найти наставников, команды, секции, проекты и первые возможности.",
      },
      { property: "og:title", content: "TalentBridge - школьные таланты без невидимости" },
      {
        property: "og:description",
        content: "Каталог талантов, направлений и возможностей для школьников.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
            <Sparkles className="size-3" /> Кейс 1: заметить талант каждого школьника
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto">
            Платформа, где школьные <span className="text-primary">таланты</span> становятся видимыми
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Футболисты, художники, программисты, музыканты, исследователи и ребята из десятков
            других сфер могут собрать профиль, показать достижения и найти подходящие возможности.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/register">
                Создать профиль <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/freelancers">Смотреть таланты</Link>
            </Button>
          </div>
          <div className="mt-10 max-w-2xl mx-auto">
            <MotivationStrip />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <MotivationBanner />
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="text-2xl font-semibold tracking-tight mb-6">Сферы талантов</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {CATEGORIES.map((c) => {
              const Icon = getCategoryIcon(c);
              return (
                <Link
                  key={c}
                  to="/projects"
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-accent/40 transition"
                >
                  <div className="size-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center mb-3">
                    <Icon className="size-4" />
                  </div>
                  <div className="font-medium">{c}</div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 grid md:grid-cols-3 gap-4">
          <Feature
            icon={<Shield className="size-5" />}
            title="Профиль достижений"
            desc="Школьник показывает направление, навыки, практику, город и портфолио."
          />
          <Feature
            icon={<Star className="size-5" />}
            title="Навигация по возможностям"
            desc="Секции, проекты, конкурсы, команды и наставники собираются в одном месте."
          />
          <Feature
            icon={<Sparkles className="size-5" />}
            title="AI-подбор"
            desc="Платформа помогает сопоставить талант школьника с подходящими заданиями и людьми."
          />
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <MotivationBanner />
        </section>
      </main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} TalentBridge
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] hover:border-primary/20">
      <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-primary/15 group-hover:scale-110">
        <span className="transition-all duration-300 group-hover:brightness-125">{icon}</span>
      </div>
      <div className="font-medium mb-1">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}
