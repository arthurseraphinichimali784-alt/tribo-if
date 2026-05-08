import { Bookmark } from "lucide-react";
import { useFavorite } from "@/hooks/useFavorite";
import { cn } from "@/lib/utils";

export function FavoriteButton({ materialId, count, compact = false }: { materialId: string; count?: number; compact?: boolean }) {
  const { saved, toggle, busy } = useFavorite(materialId);
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      disabled={busy}
      aria-label={saved ? "Remover dos salvos" : "Salvar"}
      className={cn(
        "inline-flex items-center gap-1 transition-all",
        compact ? "text-xs hover:text-primary" : "px-3 py-2 rounded-lg glass hover:border-primary/40",
        saved && "text-primary",
        busy && "scale-95",
      )}
    >
      <Bookmark className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", saved && "fill-current")} />
      {typeof count === "number" && <span>{count}</span>}
      {!compact && <span className="text-sm">{saved ? "Salvo" : "Salvar"}</span>}
    </button>
  );
}
