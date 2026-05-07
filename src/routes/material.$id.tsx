import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useMaterialLike } from "@/hooks/useMaterialLike";
import { subjectLabel, typeLabel } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, Heart, Loader2, Star, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/material/$id")({ component: MaterialDetail });

function MaterialDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [m, setM] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("materials")
      .select("*, profiles(username,avatar_url,full_name,trust_score,level)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[material]", error);
        setM(data);
        setLoading(false);
      });

    const channel = supabase
      .channel(`material-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "materials", filter: `id=eq.${id}` },
        (p) => setM((prev: any) => prev ? { ...prev, ...p.new } : prev))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const { likes, liked, toggle, busy } = useMaterialLike(id, m?.likes ?? 0);

  const handleDownload = async () => {
    if (!user) { toast.error("Faça login para baixar"); nav({ to: "/auth" }); return; }
    if (!m?.file_path) { toast.error("Este material não tem arquivo anexado"); return; }
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from("materials")
        .createSignedUrl(m.file_path, 60);
      if (error) throw error;
      await supabase.from("materials").update({ downloads: (m.downloads ?? 0) + 1 }).eq("id", id);
      window.open(data.signedUrl, "_blank");
      toast.success("Download iniciado!");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao baixar arquivo");
    } finally { setDownloading(false); }
  };

  if (loading) return (
    <div className="min-h-screen"><Header /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>
  );
  if (!m) return (
    <div className="min-h-screen"><Header /><div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">Material não encontrado</h1>
      <Link to="/marketplace"><Button>Voltar ao marketplace</Button></Link>
    </div></div>
  );

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar ao marketplace
        </Link>

        <div className="glass-strong rounded-3xl overflow-hidden mb-6">
          <div className="aspect-[16/7] bg-gradient-to-br from-primary/20 via-accent/10 to-transparent flex items-center justify-center text-7xl">
            {m.cover_url ? <img src={m.cover_url} alt={m.title} className="w-full h-full object-cover" /> : "📄"}
          </div>
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-3 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary font-medium">{subjectLabel(m.subject)}</span>
              <span className="px-2.5 py-1 rounded-full bg-muted">{typeLabel(m.type)}</span>
              <span className="text-muted-foreground capitalize">{m.difficulty}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{m.title}</h1>
            {m.description && <p className="text-muted-foreground mb-6 whitespace-pre-wrap">{m.description}</p>}

            <div className="flex flex-wrap items-center gap-6 mb-6 text-sm">
              <button onClick={toggle} disabled={busy} className={cn("flex items-center gap-1.5 hover:text-primary transition", liked && "text-primary")}>
                <Heart className={cn("h-4 w-4", liked && "fill-current")} /> {likes}
              </button>
              <span className="flex items-center gap-1.5 text-muted-foreground"><Download className="h-4 w-4" /> {m.downloads}</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><Star className="h-4 w-4 text-warning" /> {Number(m.rating).toFixed(1)}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/50">
              <div className="text-2xl font-bold">
                {Number(m.price) === 0 ? <span className="text-primary">Grátis</span> : `R$ ${Number(m.price).toFixed(2)}`}
              </div>
              <Button onClick={handleDownload} disabled={downloading} size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow">
                {downloading ? "Carregando..." : (<><Download className="h-4 w-4 mr-2" /> Baixar material</>)}
              </Button>
            </div>
          </div>
        </div>

        {m.profiles && (
          <div className="glass rounded-2xl p-5 flex items-center gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-primary/30">
              <AvatarImage src={m.profiles.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                {(m.profiles.full_name ?? m.profiles.username ?? "U").slice(0,2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold">{m.profiles.full_name ?? m.profiles.username}</div>
              <div className="text-xs text-muted-foreground">@{m.profiles.username} · Nível {m.profiles.level} · Trust {Number(m.profiles.trust_score).toFixed(1)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
