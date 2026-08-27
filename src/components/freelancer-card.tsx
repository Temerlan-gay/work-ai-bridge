import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Star, Briefcase, MapPin, Clock, Cake } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BoostButton } from "@/components/boost-button";

export interface FreelancerRow {
  id: string;
  username: string | null;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  age?: number | null;
  gender?: string | null;
  specialization: string | null;
  skills: string[] | null;
  hourly_rate: number | null;
  years_experience: number | null;
  availability: string | null;
  last_seen_at: string | null;
  boosted_at?: string | null;
  created_at: string;
  avg_rating: number;
  reviews_count: number;
  completed_projects: number;
}

export function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}

const AVAIL_LABEL: Record<string, string> = {
  available: "Готов",
  busy: "Занят",
  not_available: "Не доступен",
};

const AVAIL_COLOR: Record<string, string> = {
  available: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  busy: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  not_available: "bg-muted text-muted-foreground border-border",
};

const GENDER_LABEL: Record<string, string> = {
  boy: "Мальчик",
  girl: "Девочка",
  any: "Любой",
};

interface Props {
  p: FreelancerRow;
  onMessage: (id: string) => void;
  selfId?: string | null;
  onBoosted?: () => void;
}

export function FreelancerCard({ p, onMessage, selfId, onBoosted }: Props) {
  const online = isOnline(p.last_seen_at);
  const initials = (p.full_name ?? p.username ?? "?").slice(0, 2).toUpperCase();
  const profileLink = p.username ? `/freelancers/${p.username}` : null;

  return (
    <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="size-14">
            <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name ?? ""} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span
            className={`absolute bottom-0 right-0 block size-3.5 rounded-full ring-2 ring-card ${online ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
            title={online ? "Online" : "Offline"}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold truncate">{p.full_name ?? p.username ?? "Подросток"}</div>
            {p.availability && (
              <Badge variant="outline" className={`text-[10px] py-0 px-1.5 border ${AVAIL_COLOR[p.availability] ?? ""}`}>
                {AVAIL_LABEL[p.availability] ?? p.availability}
              </Badge>
            )}
          </div>
          {p.username && <div className="text-xs text-muted-foreground">@{p.username}</div>}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {p.specialization && <span>{p.specialization}</span>}
            {p.age != null && (
              <span className="inline-flex items-center gap-1">
                <Cake className="size-3" />
                {p.age} лет
              </span>
            )}
            {p.gender && GENDER_LABEL[p.gender] && <span>{GENDER_LABEL[p.gender]}</span>}
            {p.avg_rating > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                <span className="font-medium text-foreground">{p.avg_rating.toFixed(1)}</span>
                <span>({p.reviews_count})</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Briefcase className="size-3" />
                {p.completed_projects} проектов
            </span>
            {p.country && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {[p.city, p.country].filter(Boolean).join(", ")}
              </span>
            )}
            {p.years_experience != null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {p.years_experience} лет практики
              </span>
            )}
          </div>
        </div>
      </div>

      {p.bio && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{p.bio}</p>}

      {p.skills && p.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.skills.slice(0, 5).map((s) => (
            <Badge key={s} variant="secondary" className="text-[11px] font-normal">
              {s}
            </Badge>
          ))}
          {p.skills.length > 5 && (
            <span className="text-[11px] text-muted-foreground">+{p.skills.length - 5}</span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="text-sm">
          {p.hourly_rate != null ? (
            <>
              <span className="font-semibold">${Number(p.hourly_rate).toFixed(0)}</span>
              <span className="text-muted-foreground">/час</span>
            </>
          ) : (
            <span className="text-muted-foreground text-xs">Не указано</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onMessage(p.id)} disabled={selfId === p.id}>
            <MessageSquare className="size-4" /> Написать
          </Button>
          {selfId === p.id && (
            <BoostButton kind="profile" id={p.id} boostedAt={p.boosted_at} onBoosted={onBoosted} />
          )}
          {profileLink ? (
            <Button asChild size="sm">
              <Link to="/freelancers/$username" params={{ username: p.username! }}>Профиль</Link>
            </Button>
          ) : (
            <Button size="sm" disabled>Профиль</Button>
          )}
        </div>
      </div>
    </div>
  );
}
