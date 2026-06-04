import { Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, LogOut, Upload, LayoutDashboard, User as UserIcon, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useUserStats } from "@/hooks/useUserStats";
import { XPBar } from "@/components/XPBar";
import { LevelRing } from "@/components/LevelRing";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchCommand } from "@/components/SearchCommand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Header() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const { stats } = useUserStats(user?.id);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    if (!user) { setUsername(""); return; }
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? ""));
  }, [user]);

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-border/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-3">
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent btn-glow group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold hidden sm:inline">
            Study<span className="text-gradient">Hub</span> IF
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/marketplace" className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/50 transition" activeProps={{ className: "bg-secondary/70 text-primary" }}>
            Marketplace
          </Link>
          <Link to="/tutores" className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/50 transition" activeProps={{ className: "bg-secondary/70 text-primary" }}>
            Tutores
          </Link>
          {user && (
            <Link to="/salvos" className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/50 transition" activeProps={{ className: "bg-secondary/70 text-primary" }}>
              Salvos
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <SearchCommand />
          {user ? (
            <>
              <NotificationBell />
              <Button size="sm" className="bg-gradient-to-r from-primary to-accent btn-glow text-primary-foreground hidden sm:inline-flex" onClick={() => nav({ to: "/upload" })}>
                <Upload className="h-4 w-4 mr-1.5" /> Publicar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full hover:opacity-90 transition" aria-label="Menu">
                    <LevelRing level={stats?.level ?? 1} name={username || user.email || "U"} size="sm" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-semibold">@{username || "você"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Nível {stats?.level ?? 1} · {stats?.xp ?? 0} XP</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {username && (
                    <DropdownMenuItem onClick={() => nav({ to: "/u/$username", params: { username } })}>
                      <UserIcon className="h-4 w-4 mr-2" /> Meu perfil
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => nav({ to: "/dashboard" })}>
                    <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => nav({ to: "/upload" })}>
                    <Upload className="h-4 w-4 mr-2" /> Publicar material
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => nav({ to: "/configuracoes" })}>
                    <Settings className="h-4 w-4 mr-2" /> Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await signOut(); nav({ to: "/" }); }}>
                    <LogOut className="h-4 w-4 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => nav({ to: "/auth" })}>Entrar</Button>
              <Button size="sm" className="bg-gradient-to-r from-primary to-accent btn-glow text-primary-foreground" onClick={() => nav({ to: "/auth", search: { mode: "signup" } as any })}>
                Cadastrar
              </Button>
            </>
          )}
        </div>
      </div>
      {user && stats && <XPBar xp={stats.xp} level={stats.level} compact />}
    </header>
  );
}
