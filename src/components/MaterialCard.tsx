import { Download, Star } from "lucide-react";
import { subjectLabel, typeLabel } from "@/lib/constants";

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
  profiles?: { username: string; avatar_url: string | null } | null;
}

export function MaterialCard({ m }: { m: MaterialItem }) {
  return (
    <div className="glass rounded-2xl p-5 hover:border-primary/50 hover:-translate-y-1 transition-all group cursor-pointer">
      <div className="aspect-[4/3] rounded-xl mb-4 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent flex items-center justify-center text-4xl overflow-hidden">
        {m.cover_url ? <img src={m.cover_url} alt={m.title} className="w-full h-full object-cover" /> : "📄"}
      </div>
      <div className="flex items-center gap-2 mb-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">{subjectLabel(m.subject)}</span>
        <span className="text-muted-foreground">{typeLabel(m.type)}</span>
      </div>
      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition">{m.title}</h3>
      {m.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{m.description}</p>}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Star className="h-3 w-3 text-warning" />{m.rating.toFixed(1)}</span>
          <span className="flex items-center gap-1"><Download className="h-3 w-3" />{m.downloads}</span>
        </div>
        <div className="font-bold text-lg">
          {m.price === 0 ? <span className="text-primary">Grátis</span> : `R$ ${m.price.toFixed(2)}`}
        </div>
      </div>
    </div>
  );
}
