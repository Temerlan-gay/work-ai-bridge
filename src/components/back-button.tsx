import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ fallback = "/", label = "Назад" }: { fallback?: string; label?: string }) {
  const router = useRouter();
  const onClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: fallback });
    }
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
      aria-label="Назад"
    >
      <ArrowLeft className="size-4" /> {label}
    </Button>
  );
}