import { Download, Heart, Star, Bookmark } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { subjectLabel, typeLabel } from "@/lib/constants";
import { useMaterialLike } from "@/hooks/useMaterialLike";
import { useFavorite } from "@/hooks/useFavorite";
import { cn } from "@/lib/utils";

export interface MaterialItem {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  type: string;
  difficulty: string;
  price: number;
  downloads: number;
  rating: number;
  cover_url: string | null;
  likes?: number;
  saves_count?: number;
  views_count?: number;
  profiles?: { username: string; avatar_url: string | null } | null;
}

export function MaterialCard({ m }: { m: MaterialItem }) {
  const { likes, liked, toggle, busy } = useMaterialLike(m.id, m.likes ?? 0);
  const { saved, toggle: toggleSave, busy: savingBusy } = useFavorite(m.id);

  return (
    <Link to="/material/$id" params={{ id: m.id }} className="block glass rounded-2xl p-5 hover:border-primary/50 hover:-translate-y-1 transition-all group">
      <div className="aspect-[4/3] rounded-xl mb-4 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent flex items-center justify-center text-4xl overflow-hidden">
        {m.cover_url ? <img src={m.cover_url} alt={m.title} className="w-full h-full object-cover" /> : "📄"}
      </div>
      <div className="flex items-center gap-2 mb-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">{subjectLabel(m.subject)}</span>
        <span className="text-muted-foreground">{typeLabel(m.type)}</span>
      </div>
      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition">{m.title}</h3>
      {m.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{m.description}</p>}
      {m.profiles?.username && (
        <p className="text-xs text-muted-foreground mt-2">por @{m.profiles.username}</p>
      )}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
            disabled={busy}
            className={cn("flex items-center gap-1 hover:text-primary transition", liked && "text-primary")}
            aria-label="Curtir"
          >
            <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />{likes}
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSave(); }}
            disabled={savingBusy}
            className={cn("flex items-center gap-1 hover:text-primary transition", saved && "text-primary")}
            aria-label="Salvar"
          >
            <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />{m.saves_count ?? 0}
          </button>
          <span className="flex items-center gap-1"><Download className="h-3 w-3" />{m.downloads}</span>
          <span className="flex items-center gap-1"><Star className="h-3 w-3 text-warning" />{m.rating.toFixed(1)}</span>
        </div>
        <div className="font-bold text-lg">
          {m.price === 0 ? <span className="text-primary">Grátis</span> : `R$ ${m.price.toFixed(2)}`}
        </div>
      </div>
    </Link>
  );
}
