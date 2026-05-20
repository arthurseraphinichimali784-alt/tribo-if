import { Link } from "@tanstack/react-router";
import { Home, Store, Upload, Bookmark, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function MobileNav() {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? ""));
  }, [user]);

  const items = [
    { to: "/", icon: Home, label: "Início", params: undefined },
    { to: "/marketplace", icon: Store, label: "Buscar", params: undefined },
    { to: "/upload", icon: Upload, label: "Publicar", params: undefined, highlight: true },
    { to: "/salvos", icon: Bookmark, label: "Salvos", params: undefined },
    user && username
      ? { to: "/u/$username", icon: User, label: "Perfil", params: { username } }
      : { to: "/auth", icon: User, label: "Entrar", params: undefined },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/50">
      <div className="grid grid-cols-5">
        {items.map((it: any) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.label}
              to={it.to}
              params={it.params}
              className="flex flex-col items-center justify-center py-2.5 text-[10px] text-muted-foreground hover:text-primary transition"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: it.to === "/" }}
            >
              {it.highlight ? (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center btn-glow -mt-2 mb-0.5">
                  <Icon className="h-4 w-4 text-primary-foreground" />
                </div>
              ) : (
                <Icon className="h-5 w-5 mb-0.5" />
              )}
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
