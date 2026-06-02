import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Briefcase, Folder, LayoutDashboard, MessageSquare, Settings, Star, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/profile", label: "Profile", icon: User },
  { to: "/dashboard/portfolio", label: "Portfolio", icon: Folder },
  { to: "/dashboard/projects", label: "Projects", icon: Briefcase },
  { to: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { to: "/dashboard/reviews", label: "Reviews", icon: Star },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardShell({ children }: { children?: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="hidden md:block">
          <nav className="sticky top-20 space-y-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition",
                  path === to ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}