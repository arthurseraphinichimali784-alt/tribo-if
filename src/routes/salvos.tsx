import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { MaterialCard, type MaterialItem } from "@/components/MaterialCard";
import { MaterialSkeleton } from "@/components/MaterialSkeleton";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/salvos")({ component: SavedPage });

function SavedPage() {
  const { user, ready } = useAuth();
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = () => supabase.from("favorites")
      .select("material_id,materials(id,title,description,subject,type,difficulty,price,downloads,rating,cover_url,likes,saves_count,profiles(username,avatar_url))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems(((data ?? []) as any[]).map((r) => r.materials).filter(Boolean));
        setLoading(false);
      });
    load();
    const ch = supabase.channel(`fav-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (!ready) return null;
  if (!user) return (
    <div className="min-h-screen"><Header /><div className="container mx-auto px-4 py-20 text-center">
      <Bookmark className="h-12 w-12 text-primary mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-3">Faça login para ver seus salvos</h1>
      <Link to="/auth"><Button>Entrar</Button></Link>
    </div></div>
  );

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-6">
          <Bookmark className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Meus salvos</h1>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => <MaterialSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="text-6xl mb-4">🔖</div>
            <h3 className="text-xl font-semibold mb-2">Nada salvo ainda</h3>
            <p className="text-muted-foreground mb-4">Salve materiais para revisitar depois.</p>
            <Link to="/marketplace"><Button>Explorar materiais</Button></Link>
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
