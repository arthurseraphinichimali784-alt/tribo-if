import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Heart, MessageCircle, UserPlus, Trophy, Shield, Sparkles, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const ICONS: Record<Notification["type"], any> = {
  comment: MessageCircle,
  reply: MessageCircle,
  like: Heart,
  follow: UserPlus,
  badge: Trophy,
  report_resolved: Shield,
  material_featured: Sparkles,
  system: Bell,
};

const COLORS: Record<Notification["type"], string> = {
  comment: "text-accent",
  reply: "text-accent",
  like: "text-flame",
  follow: "text-primary",
  badge: "text-tier-gold",
  report_resolved: "text-success",
  material_featured: "text-tier-diamond",
  system: "text-muted-foreground",
};

export function NotificationBell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { items, unread, markAllRead, markOneRead } = useNotifications(user?.id);

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notificações"
          className="relative h-9 w-9 rounded-full hover:bg-secondary/60 transition flex items-center justify-center"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-flame text-[10px] font-bold text-white flex items-center justify-center animate-pop">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 max-h-[70vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="font-semibold">Notificações</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              <Check className="h-3 w-3 mr-1" /> Marcar todas
            </Button>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {items.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-3 opacity-40" />
              Nenhuma notificação ainda.
              <br />Bora interagir com a comunidade!
            </div>
          ) : (
            items.slice(0, 12).map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const colorClass = COLORS[n.type] ?? "text-muted-foreground";
              const content = (
                <div className="flex gap-3 items-start">
                  <div className={cn("h-9 w-9 rounded-full bg-secondary/60 flex items-center justify-center shrink-0", colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-tight">{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
                </div>
              );
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    markOneRead(n.id);
                    if (n.link) nav({ to: n.link as any });
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-secondary/40 transition border-b border-border/30 last:border-0",
                    !n.read && "bg-primary/[0.04]"
                  )}
                >
                  {content}
                </button>
              );
            })
          )}
        </div>

        <Link
          to="/notificacoes"
          className="px-4 py-2.5 text-xs text-center text-primary hover:bg-secondary/40 border-t border-border/50 font-medium"
        >
          Ver todas
        </Link>
      </PopoverContent>
    </Popover>
  );
}
