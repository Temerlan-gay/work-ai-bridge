import { Link, useNavigate } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut, MessageSquare, Settings } from "lucide-react";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 px-2 py-1 rounded-md transition-all duration-200 hover:shadow-[0_6px_20px_-8px_color-mix(in_oklab,var(--foreground)_22%,transparent)]">
          <div className="size-7 rounded-md bg-primary" />
          <span className="font-semibold tracking-tight">WorkBridge</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/projects" className="px-3 py-1.5 rounded-md transition-all duration-200 hover:text-foreground hover:shadow-[0_6px_20px_-8px_color-mix(in_oklab,var(--foreground)_22%,transparent)]">Projects</Link>
          <Link to="/freelancers" className="px-3 py-1.5 rounded-md transition-all duration-200 hover:text-foreground hover:shadow-[0_6px_20px_-8px_color-mix(in_oklab,var(--foreground)_22%,transparent)]">Freelancers</Link>
          {user && <Link to="/chats" className="px-3 py-1.5 rounded-md transition-all duration-200 hover:text-foreground hover:shadow-[0_6px_20px_-8px_color-mix(in_oklab,var(--foreground)_22%,transparent)]">Chats</Link>}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/chats" })} aria-label="Chats">
                <MessageSquare className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/settings" })} aria-label="Settings">
                <Settings className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
                <LayoutDashboard className="size-4" /> Dashboard
              </Button>
              <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate({ to: "/" }); }} aria-label="Sign out">
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/login" })}>Log in</Button>
              <Button size="sm" onClick={() => navigate({ to: "/register" })}>Sign up</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}