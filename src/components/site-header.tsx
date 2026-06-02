import { Link, useNavigate } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut } from "lucide-react";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-primary" />
          <span className="font-semibold tracking-tight">WorkBridge</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/projects" className="hover:text-foreground transition">Projects</Link>
          <Link to="/freelancers" className="hover:text-foreground transition">Freelancers</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
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