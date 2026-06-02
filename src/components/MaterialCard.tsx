import { Download, Heart, Bookmark, MessageCircle, ArrowUpRight } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { SUBJECTS, subjectLabel, typeLabel } from "@/lib/constants";
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

const DIFF_CLASS: Record<string, string> = {
  facil: "bg-success/20 text-success border-success/30",
  medio: "bg-warning/20 text-warning border-warning/30",
  dificil: "bg-destructive/20 text-destructive border-destructive/30",
};
const DIFF_LABEL: Record<string, string> = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };

export function MaterialCard({ m, preview = false }: { m: MaterialItem; preview?: boolean }) {
  const navigate = useNavigate();
  const { likes, liked, toggle, busy } = useMaterialLike(m.id, m.likes ?? 0);
  const { saved, toggle: toggleSave, busy: savingBusy } = useFavorite(m.id);
  const emoji = SUBJECTS.find((s) => s.value === m.subject)?.emoji ?? "📄";

  const Inner = (
    <motion.div
      whileHover={preview ? undefined : { y: -4 }}
      transition={{ duration: 0.2 }}
      className="glass rounded-2xl p-4 hover:border-primary/50 transition-colors group h-full flex flex-col"
    >
      <div className="relative aspect-[5/3] rounded-xl mb-3 overflow-hidden bg-gradient-to-br from-primary/30 via-accent/15 to-background flex items-center justify-center">
        {m.cover_url ? (
          <img src={m.cover_url} alt={m.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl drop-shadow-lg select-none">{emoji}</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background/80 backdrop-blur border border-primary/30 text-primary">
            {subjectLabel(m.subject)}
          </span>
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur border", DIFF_CLASS[m.difficulty] ?? "bg-muted/60")}>
            {DIFF_LABEL[m.difficulty] ?? m.difficulty}
          </span>
        </div>
        <div className="absolute bottom-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-background/80 backdrop-blur border border-border">
          {typeLabel(m.type)}
        </div>
      </div>

      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition leading-tight">{m.title}</h3>
      {m.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{m.description}</p>}

      {m.profiles?.username && !preview && (
        <Link
          to="/u/$username"
          params={{ username: m.profiles.username }}
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] text-muted-foreground mt-2 hover:text-primary inline-flex items-center gap-1 w-fit"
        >
          por @{m.profiles.username}
        </Link>
      )}

      <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-border/40 mt-3">
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!preview) toggle(); }}
            disabled={busy || preview}
            className={cn("flex items-center gap-1 hover:text-destructive transition", liked && "text-destructive")}
            aria-label="Curtir"
          >
            <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />{likes}
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!preview) toggleSave(); }}
            disabled={savingBusy || preview}
            className={cn("flex items-center gap-1 hover:text-accent transition", saved && "text-accent")}
            aria-label="Salvar"
          >
            <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />{m.saves_count ?? 0}
          </button>
          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />0</span>
          <span className="flex items-center gap-1"><Download className="h-3 w-3" />{m.downloads}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="font-bold text-sm">
            {m.price === 0 ? <span className="text-primary">Grátis</span> : <span>R$ {m.price.toFixed(2)}</span>}
          </div>
          {!preview && <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />}
        </div>
      </div>
    </motion.div>
  );

  if (preview) return Inner;
  return <Link to="/material/$id" params={{ id: m.id }} className="block h-full">{Inner}</Link>;
}
