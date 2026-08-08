import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { listKits } from "@/lib/kits.functions";
import { KitBadge, TagChips, DifficultyBadge, LevelBadge } from "@/components/ContentTags";
import { subjectEmoji, subjectLabel } from "@/lib/constants";
import { Loader2, Package, Star } from "lucide-react";

export const Route = createFileRoute("/kits")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Kits de estudo | StudyHub IF" },
      { name: "description", content: "Conjuntos completos de apostilas, videoaulas, exercícios e simulados para a prova do Instituto Federal, por um preço menor." },
      { property: "og:title", content: "Kits de estudo | StudyHub IF" },
      { property: "og:description", content: "Economize comprando materiais em conjunto: apostilas, videoaulas, exercícios e simulados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KitsPage,
});

interface KitRow {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  price: number;
  subject: string | null;
  level: string | null;
  difficulty: string;
  topics: string[];
  rating: number;
  rating_count: number;
  item_count: number;
  profiles?: { username: string; avatar_url: string | null } | null;
}

function KitsPage() {
  const fetchKits = useServerFn(listKits);
  const [kits, setKits] = useState<KitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchKits({ data: {} });
        if (!cancelled) setKits(res as unknown as KitRow[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <main className="container max-w-6xl py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-7 w-7 text-accent" /> Kits de estudo
          </h1>
          <p className="text-muted-foreground mt-1">
            Vários materiais reunidos em um só produto — e por um preço menor do que comprar separado.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : kits.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">Nenhum kit publicado ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              É professor? Monte um kit com seus materiais no painel do criador.
            </p>
            <Link to="/dashboard" className="text-sm text-primary hover:underline mt-3 inline-block">Ir para o painel</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kits.map((k) => (
              <Link
                key={k.id}
                to="/kit/$id"
                params={{ id: k.id }}
                className="glass rounded-2xl overflow-hidden hover:border-primary/50 transition group"
              >
                <div className="h-32 bg-gradient-to-br from-accent/25 to-primary/20 flex items-center justify-center text-4xl">
                  {k.cover_url ? (
                    <img src={k.cover_url} alt={`Capa do ${k.title}`} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span aria-hidden>{k.subject ? subjectEmoji(k.subject) : "📦"}</span>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <KitBadge />
                    <LevelBadge value={k.level} />
                    <DifficultyBadge value={k.difficulty} />
                  </div>
                  <h2 className="font-semibold leading-tight group-hover:text-primary transition">{k.title}</h2>
                  <p className="text-xs text-muted-foreground line-clamp-2">{k.description}</p>
                  <TagChips tags={k.topics} max={3} />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {k.item_count} {k.item_count === 1 ? "material" : "materiais"}
                      {k.subject && ` • ${subjectLabel(k.subject)}`}
                    </span>
                    <span className="font-bold text-primary">
                      {Number(k.price) > 0 ? `R$ ${Number(k.price).toFixed(2)}` : "Grátis"}
                    </span>
                  </div>
                  {k.rating_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-warning text-warning" /> {Number(k.rating).toFixed(1)} ({k.rating_count})
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
