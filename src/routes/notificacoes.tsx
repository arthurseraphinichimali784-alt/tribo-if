import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell, Heart, MessageCircle, UserPlus, Trophy, Shield, Sparkles, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/notificacoes")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: NotificationsPage,
});

const ICONS: Record<string, any> = {
  comment: MessageCircle, reply: MessageCircle, like: Heart, follow: UserPlus,
  badge: Trophy, report_resolved: Shield, material_featured: Sparkles, system: Bell,
};
const COLORS: Record<string, string> = {
  comment: "text-accent", reply: "text-accent", like: "text-flame", follow: "text-primary",
  badge: "text-tier-gold", report_resolved: "text-success", material_featured: "text-tier-diamond", system: "text-muted-foreground",
};

function NotificationsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { items, unread, markAllRead, markOneRead, remove, loading } = useNotifications(user?.id);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Notificações</h1>
            <p className="text-muted-foreground text-sm">
              {unread > 0 ? `${unread} não ${unread === 1 ? "lida" : "lidas"}` : "Tudo em dia ✨"}
            </p>
          </div>
          {unread > 0 && (
            <Button variant="outline" onClick={markAllRead}>
              <Check className="h-4 w-4 mr-2" /> Marcar todas como lidas
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl h-20 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="glass-strong rounded-3xl p-12 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Sem notificações ainda</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Quando alguém curtir, comentar ou seguir você, aparece aqui.
            </p>
            <Link to="/marketplace">
              <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                Explorar marketplace
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const colorClass = COLORS[n.type] ?? "text-muted-foreground";
              return (
                <div
                  key={n.id}
                  className={cn(
                    "glass rounded-2xl p-4 flex items-start gap-3 group hover:border-primary/30 transition cursor-pointer",
                    !n.read && "bg-primary/[0.05] border-primary/20"
                  )}
                  onClick={() => {
                    markOneRead(n.id);
                    if (n.link) nav({ to: n.link as any });
                  }}
                >
                  <div className={cn("h-10 w-10 rounded-full bg-secondary/60 flex items-center justify-center shrink-0", colorClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{n.title}</div>
                    {n.body && <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>}
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                    className="opacity-0 group-hover:opacity-100 transition h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive flex items-center justify-center"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
