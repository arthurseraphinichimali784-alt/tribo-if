import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { MaterialCard, type MaterialItem } from "@/components/MaterialCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SUBJECTS } from "@/lib/constants";
import { Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/marketplace")({
  validateSearch: (s: Record<string, unknown>) => ({
    subject: typeof s.subject === "string" ? s.subject : undefined,
  }),
  component: Marketplace,
});

function Marketplace() {
  const { subject: initialSubject } = Route.useSearch();
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<string | undefined>(initialSubject);
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from("materials")
      .select("id,title,description,subject,type,difficulty,price,downloads,rating,cover_url,likes,profiles(username,avatar_url)")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(60);
    if (subject) query = query.eq("subject", subject as any);
    if (q) query = query.ilike("title", `%${q}%`);
    query.then(({ data, error }) => {
      if (error) console.error("[marketplace] erro ao buscar materiais", error);
      setItems((data ?? []) as any);
      setLoading(false);
    });
  }, [subject, q]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Marketplace de Materiais</h1>
          <p className="text-muted-foreground">Descubra conteúdo feito por estudantes dos Institutos Federais</p>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-4 mb-8 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar materiais..." className="pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={!subject ? "default" : "outline"} onClick={() => setSubject(undefined)}>Todas</Button>
            {SUBJECTS.map((s) => (
              <Button key={s.value} size="sm" variant={subject === s.value ? "default" : "outline"} onClick={() => setSubject(s.value)}>
                <span className="mr-1">{s.emoji}</span>{s.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">Nenhum material ainda</h3>
            <p className="text-muted-foreground">Seja o primeiro a publicar nesta categoria!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((m) => <MaterialCard key={m.id} m={m} />)}
          </div>
        )}
      </div>
    </div>
  );
}
