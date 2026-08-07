import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { MaterialCard, type MaterialItem } from "@/components/MaterialCard";
import { MaterialSkeleton } from "@/components/MaterialSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SUBJECTS, TOPIC_SUGGESTIONS } from "@/lib/constants";
import { Search, X } from "lucide-react";

const SELECT =
  "id,title,description,subject,type,difficulty,price,downloads,rating,cover_url,likes,saves_count,comments_count,topics,profiles(username,avatar_url)";

type Sort = "recentes" | "populares" | "baixados";
type PriceFilter = "todos" | "gratis" | "pagos";

export const Route = createFileRoute("/marketplace")({
  validateSearch: (s: Record<string, unknown>): { subject?: string } =>
    typeof s.subject === "string" ? { subject: s.subject } : {},
  component: Marketplace,
  head: () => ({
    meta: [
      { title: "Marketplace de materiais de estudo | StudyHub IF" },
      { name: "description", content: "Resumos, mapas mentais, listas e simulados feitos por estudantes dos Institutos Federais. Filtre por matéria, tópico e dificuldade." },
      { property: "og:title", content: "Marketplace de materiais | StudyHub IF" },
      { property: "og:description", content: "Encontre resumos e simulados para as provas dos Institutos Federais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Marketplace() {
  const { subject: initialSubject } = Route.useSearch();
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<string | undefined>(initialSubject);
  const [topic, setTopic] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<Sort>("recentes");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("todos");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  // debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => { setTopic(undefined); }, [subject]);

  const topics = useMemo(
    () => (subject ? TOPIC_SUGGESTIONS[subject] ?? [] : []),
    [subject],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    let query = supabase.from("materials").select(SELECT).eq("published", true).limit(60);

    if (subject) query = query.eq("subject", subject as any);
    if (topic) query = query.contains("topics", [topic]);
    if (priceFilter === "gratis") query = query.eq("price", 0);
    if (priceFilter === "pagos") query = query.gt("price", 0);
    if (q) {
      const safe = q.replace(/[,%()]/g, " ");
      query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }

    if (sort === "populares") query = query.order("likes", { ascending: false });
    else if (sort === "baixados") query = query.order("downloads", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    query.then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.error("[marketplace] erro ao buscar materiais", error);
      setItems((data ?? []) as any);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [subject, q, topic, sort, priceFilter]);

  useEffect(() => {
    const channel = supabase
      .channel("marketplace-materials")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "materials" }, (p) => {
        const n: any = p.new;
        setItems((prev) => prev.map((it) => it.id === n.id
          ? { ...it, likes: n.likes, downloads: n.downloads, rating: n.rating, saves_count: n.saves_count, comments_count: n.comments_count }
          : it));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const hasFilters = !!subject || !!topic || !!q || priceFilter !== "todos";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Marketplace de Materiais</h1>
          <p className="text-muted-foreground">Descubra conteúdo feito por estudantes dos Institutos Federais</p>
        </div>

        {/* Filtros */}
        <div className="glass rounded-2xl p-4 mb-8 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Buscar por título ou descrição..."
              className="pl-9"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={!subject ? "default" : "outline"} onClick={() => setSubject(undefined)}>Todas</Button>
            {SUBJECTS.map((s) => (
              <Button key={s.value} size="sm" variant={subject === s.value ? "default" : "outline"} onClick={() => setSubject(s.value)}>
                <span className="mr-1">{s.emoji}</span>{s.label}
              </Button>
            ))}
          </div>

          {topics.length > 0 && (
            <div className="flex gap-1.5 flex-wrap border-t border-border/40 pt-3">
              <span className="text-xs text-muted-foreground self-center mr-1">Tópicos:</span>
              {topics.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(topic === t ? undefined : t)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${topic === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/60"}`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
            <div className="flex gap-1.5">
              {([["recentes", "Recentes"], ["populares", "Mais curtidos"], ["baixados", "Mais baixados"]] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setSort(v)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${sort === v ? "bg-secondary border-primary/60 text-foreground" : "border-border text-muted-foreground hover:border-primary/60"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 sm:ml-auto">
              {([["todos", "Todos"], ["gratis", "Grátis"], ["pagos", "Pagos"]] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setPriceFilter(v)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${priceFilter === v ? "bg-secondary border-primary/60 text-foreground" : "border-border text-muted-foreground hover:border-primary/60"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {hasFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setSubject(undefined); setTopic(undefined); setQInput(""); setPriceFilter("todos"); }}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <MaterialSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">Nenhum material encontrado</h3>
            <p className="text-muted-foreground">Tente outros filtros ou seja o primeiro a publicar nesta categoria!</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">{items.length} material(is) encontrado(s)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((m) => <MaterialCard key={m.id} m={m} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
