import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import { ArrowRight, Shield, Star } from "lucide-react";
import { getCategoryIcon } from "@/lib/category-icons";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WorkBridge — Freelance marketplace for CIS" },
      { name: "description", content: "Hire trusted freelancers across CIS. Lower fees, secure payments, AI-powered project briefs." },
      { property: "og:title", content: "WorkBridge — Freelance marketplace" },
      { property: "og:description", content: "Connect freelancers and clients across CIS countries." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
            <Sparkles className="size-3" /> Built for the CIS market
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto">
            The freelance marketplace<br /> built on <span className="text-primary">trust</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Lower fees, secure payments, and a reputation system that actually means something.
            Hire developers, designers, marketers and more.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/register">Get started <ArrowRight className="size-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/projects">Browse projects</Link>
            </Button>
          </div>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="text-2xl font-semibold tracking-tight mb-6">Explore by category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {CATEGORIES.map((c) => (
              <Link
                key={c}
                to="/projects"
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-accent/40 transition"
              >
                <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Sparkles className="size-4" />
                </div>
                <div className="font-medium">{c}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 pb-24 grid md:grid-cols-3 gap-4">
          <Feature icon={<Shield className="size-5" />} title="Secure payments" desc="Funds held in escrow until the work is approved." />
          <Feature icon={<Star className="size-5" />} title="Reputation that matters" desc="Verified reviews, completed-project counts, response times." />
          <Feature icon={<Sparkles className="size-5" />} title="AI project briefs" desc="Describe your idea and get a clear, detailed brief in seconds." />
        </section>
      </main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} WorkBridge
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-4">{icon}</div>
      <div className="font-medium mb-1">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}
