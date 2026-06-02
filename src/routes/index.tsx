import { createFileRoute } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Your App" },
      { name: "description", content: "Replace this with a one-sentence description of your app." },
      { property: "og:title", content: "Your App" },
      { property: "og:description", content: "Replace this with a one-sentence description of your app." },
    ],
  }),
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-8 py-5 border-b border-border">
        <span className="text-lg font-semibold tracking-tight">WorkBridge</span>
        <ThemeToggle />
      </header>
      <main className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
          Soft themes, calm colors
        </h1>
        <p className="text-muted-foreground max-w-md mb-10">
          Переключайте светлую и тёмную тему — мягкие оттенки, приятные для глаз.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
          <div className="rounded-xl border border-border bg-card p-6 text-left">
            <div className="h-2 w-10 rounded-full bg-primary mb-4" />
            <h3 className="font-medium mb-1">Primary</h3>
            <p className="text-sm text-muted-foreground">Мягкий синий акцент.</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary p-6 text-left">
            <div className="h-2 w-10 rounded-full bg-secondary-foreground/30 mb-4" />
            <h3 className="font-medium mb-1">Secondary</h3>
            <p className="text-sm text-muted-foreground">Спокойный нейтральный слой.</p>
          </div>
          <div className="rounded-xl border border-border bg-accent p-6 text-left">
            <div className="h-2 w-10 rounded-full bg-accent-foreground/40 mb-4" />
            <h3 className="font-medium mb-1">Accent</h3>
            <p className="text-sm text-muted-foreground">Дополнительный оттенок.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
