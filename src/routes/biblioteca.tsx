import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherBadge } from "@/components/TeacherBadge";
import { subjectEmoji, subjectLabel } from "@/lib/constants";
import { Library, Loader2, PlayCircle, ShoppingBag, Bookmark, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/biblioteca")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Minha Biblioteca | StudyHub IF" },
      { name: "description", content: "Todos os seus materiais adquiridos, favoritos e o progresso dos seus estudos no StudyHub IF." },
      { property: "og:title", content: "Minha Biblioteca | StudyHub IF" },
      { property: "og:description", content: "Acesse novamente seus materiais adquiridos e continue estudando de onde parou." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
});

const MATERIAL_SELECT =
  "id,title,subject,type,price,cover_url,author_id,profiles(username,full_name,avatar_url,verification_status,teaching_area,institute)";

interface LibItem {
  material: any;
  acquiredAt?: string | null;
  license?: string | null;
  progressPercent?: number;
  lastPage?: number;
  lastAccessedAt?: string | null;
}

function LibraryPage() {
  const { user, ready } = useAuth();
  const [purchased, setPurchased] = useState<LibItem[]>([]);
  const [favorites, setFavorites] = useState<LibItem[]>([]);
  const [recent, setRecent] = useState<LibItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const [p, f, r] = await Promise.all([
        supabase.from("purchases")
          .select(`license_code,status,created_at,paid_at,materials(${MATERIAL_SELECT})`)
          .eq("buyer_id", user.id).eq("status", "pago")
          .order("created_at", { ascending: false }),
        supabase.from("favorites")
          .select(`created_at,materials(${MATERIAL_SELECT})`)
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("material_progress")
          .select(`progress_percent,last_page,last_accessed_at,materials(${MATERIAL_SELECT})`)
          .eq("user_id", user.id).order("last_accessed_at", { ascending: false }).limit(30),
      ]);
      if (cancelled) return;
      const progressBy = new Map<string, any>();
      ((r.data ?? []) as any[]).forEach((row) => row.materials && progressBy.set(row.materials.id, row));

      const decorate = (m: any): Partial<LibItem> => {
        const pr = progressBy.get(m?.id);
        return pr ? { progressPercent: pr.progress_percent, lastPage: pr.last_page, lastAccessedAt: pr.last_accessed_at } : {};
      };

      setPurchased(((p.data ?? []) as any[]).filter((x) => x.materials).map((x) => ({
        material: x.materials, acquiredAt: x.paid_at ?? x.created_at, license: x.license_code, ...decorate(x.materials),
      })));
      setFavorites(((f.data ?? []) as any[]).filter((x) => x.materials).map((x) => ({
        material: x.materials, acquiredAt: x.created_at, ...decorate(x.materials),
      })));
      setRecent(((r.data ?? []) as any[]).filter((x) => x.materials).map((x) => ({
        material: x.materials,
        progressPercent: x.progress_percent,
        lastPage: x.last_page,
        lastAccessedAt: x.last_accessed_at,
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const all = (() => {
    const map = new Map<string, LibItem>();
    [...purchased, ...recent, ...favorites].forEach((it) => {
      if (it.material?.id && !map.has(it.material.id)) map.set(it.material.id, it);
    });
    return [...map.values()];
  })();

  if (!ready) return null;
  if (!user) return (
    <div className="min-h-screen"><Header />
      <div className="container mx-auto px-4 py-20 text-center">
        <Library className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-3">Entre para ver sua biblioteca</h1>
        <Link to="/auth"><Button>Entrar</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-2">
          <Library className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Minha Biblioteca</h1>
        </div>
        <p className="text-muted-foreground mb-6">Tudo que você adquiriu, salvou e estudou — em um lugar só.</p>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="todos">
            <TabsList>
              <TabsTrigger value="todos">Todos ({all.length})</TabsTrigger>
              <TabsTrigger value="recentes"><Clock className="h-3.5 w-3.5 mr-1.5" />Recentes ({recent.length})</TabsTrigger>
              <TabsTrigger value="favoritos"><Bookmark className="h-3.5 w-3.5 mr-1.5" />Favoritos ({favorites.length})</TabsTrigger>
              <TabsTrigger value="comprados"><ShoppingBag className="h-3.5 w-3.5 mr-1.5" />Adquiridos ({purchased.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="todos" className="mt-6"><Grid items={all} empty="Sua biblioteca está vazia." /></TabsContent>
            <TabsContent value="recentes" className="mt-6"><Grid items={recent} empty="Você ainda não abriu nenhum material." /></TabsContent>
            <TabsContent value="favoritos" className="mt-6"><Grid items={favorites} empty="Nenhum material favoritado." /></TabsContent>
            <TabsContent value="comprados" className="mt-6"><Grid items={purchased} empty="Você ainda não adquiriu materiais." /></TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function Grid({ items, empty }: { items: LibItem[]; empty: string }) {
  if (items.length === 0) return (
    <div className="glass rounded-2xl p-16 text-center">
      <div className="text-6xl mb-4">📚</div>
      <h3 className="text-xl font-semibold mb-2">{empty}</h3>
      <Link to="/marketplace"><Button className="mt-3">Explorar materiais</Button></Link>
    </div>
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((it) => <LibraryCard key={it.material.id} item={it} />)}
    </div>
  );
}

function LibraryCard({ item }: { item: LibItem }) {
  const m = item.material;
  const author = m.profiles;
  const pct = item.progressPercent ?? 0;
  return (
    <Link
      to="/material/$id"
      params={{ id: m.id }}
      className="glass rounded-2xl p-4 flex flex-col hover:border-primary/50 transition-colors group"
    >
      <div className="relative aspect-[5/3] rounded-xl mb-3 overflow-hidden bg-gradient-to-br from-primary/30 via-accent/15 to-background flex items-center justify-center">
        {m.cover_url ? (
          <img src={m.cover_url} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-5xl select-none">{subjectEmoji(m.subject)}</span>
        )}
        <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background/80 backdrop-blur border border-primary/30 text-primary">
          {subjectLabel(m.subject)}
        </span>
      </div>

      <h3 className="font-semibold leading-tight line-clamp-2 group-hover:text-primary transition">{m.title}</h3>
      <div className="text-xs text-muted-foreground mt-1">
        por {author?.full_name ?? `@${author?.username ?? "autor"}`}
      </div>
      <TeacherBadge p={author} className="mt-1.5" />

      <div className="mt-3 space-y-1.5">
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{pct}% concluído{item.lastPage ? ` · página ${item.lastPage}` : ""}</span>
          {item.acquiredAt && <span>{format(new Date(item.acquiredAt), "dd MMM yyyy", { locale: ptBR })}</span>}
        </div>
        {item.license && (
          <div className="text-[10px] text-muted-foreground">Licença <code className="bg-secondary/60 px-1 rounded">{item.license}</code></div>
        )}
      </div>

      <div className="mt-4">
        <Button size="sm" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
          <PlayCircle className="h-4 w-4 mr-1.5" /> {pct > 0 ? "Continuar estudando" : "Abrir material"}
        </Button>
      </div>
    </Link>
  );
}
