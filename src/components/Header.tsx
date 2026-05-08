import { Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, LogOut, Upload, LayoutDashboard, Bookmark } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-border/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent btn-glow group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">
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
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => nav({ to: "/upload" })}>
                <Upload className="h-4 w-4 mr-1" /> Publicar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => nav({ to: "/dashboard" })}>
                <LayoutDashboard className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={async () => { await signOut(); nav({ to: "/" }); }}>
                <LogOut className="h-4 w-4" />
              </Button>
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
    </header>
  );
}
