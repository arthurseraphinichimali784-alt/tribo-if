import { Link } from "@tanstack/react-router";
import { Upload, Bookmark, LayoutDashboard, Compass } from "lucide-react";

const ACTIONS = [
  { to: "/upload", icon: Upload, label: "Publicar", desc: "Compartilhe material", color: "from-primary to-primary-glow" },
  { to: "/marketplace", icon: Compass, label: "Explorar", desc: "Descubra novos resumos", color: "from-accent to-primary" },
  { to: "/salvos", icon: Bookmark, label: "Salvos", desc: "Seus favoritos", color: "from-warning to-flame" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Painel", desc: "Suas estatísticas", color: "from-tier-diamond to-accent" },
];

export function QuickActions() {
  return (
    <section className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="glass rounded-2xl p-4 hover:border-primary/40 hover:-translate-y-0.5 transition-all group"
          >
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
              <a.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="font-semibold text-sm">{a.label}</div>
            <div className="text-[11px] text-muted-foreground">{a.desc}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
