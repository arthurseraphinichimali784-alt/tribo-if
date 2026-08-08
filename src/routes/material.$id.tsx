import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMaterialLike } from "@/hooks/useMaterialLike";
import { useTrackView } from "@/hooks/useTrackView";
import { useMaterialAccess, fetchProtectedFile } from "@/hooks/useMaterialAccess";
import { acquireMaterial, saveProgress } from "@/lib/purchases.functions";
import { subjectLabel, typeLabel } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeacherBadge } from "@/components/TeacherBadge";
import { Download, Heart, Loader2, Star, ArrowLeft, MessageCircle, Lock, ShoppingCart, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { CommentThread } from "@/components/comments/CommentThread";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ReportDialog } from "@/components/ReportDialog";

export const Route = createFileRoute("/material/$id")({ component: MaterialDetail });

function MaterialDetail() {
  const { id } = Route.useParams();
  const { user, session } = useAuth();
  const nav = useNavigate();
  const [m, setM] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const blobRef = useRef<string | null>(null);

  const { access, loading: accessLoading, refresh: refreshAccess } = useMaterialAccess(id);
  const acquire = useServerFn(acquireMaterial);
  const persistProgress = useServerFn(saveProgress);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("materials")
      .select("id,title,description,subject,type,difficulty,price,cover_url,topics,likes,saves_count,comments_count,downloads,rating,author_id,published,preview_pages,profiles(username,avatar_url,full_name,trust_score,level,verification_status,teaching_area,institute)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[material]", error);
        setM(data);
        setLoading(false);
      });

    const channel = supabase
      .channel(`material-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "materials", filter: `id=eq.${id}` },
        (p) => setM((prev: any) => prev ? { ...prev, ...p.new } : prev))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useTrackView(m?.id, user?.id);

  const { likes, liked, toggle, busy } = useMaterialLike(id, m?.likes ?? 0);

  // Carrega o arquivo protegido (prévia limitada ou versão completa com marca d'água)
  useEffect(() => {
    if (!m || !session?.access_token || !access?.hasFile) return;
    let cancelled = false;
    setPreviewError(null);
    (async () => {
      try {
        const blob = await fetchProtectedFile(session.access_token, id, access.hasAccess ? "full" : "preview");
        if (cancelled) return;
        if (blobRef.current) URL.revokeObjectURL(blobRef.current);
        const url = URL.createObjectURL(blob);
        blobRef.current = url;
        setBlobUrl(url);
        try {
          const { PDFDocument } = await import("pdf-lib");
          const doc = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true });
          if (!cancelled) setTotalPages(doc.getPageCount());
        } catch { /* formato sem contagem de páginas */ }
      } catch (e: any) {
        if (!cancelled) setPreviewError(access.hasAccess ? "Não foi possível carregar o material." : "Prévia indisponível para este material.");
        console.error("[material-file]", e?.message);
      }
    })();
    return () => {
      cancelled = true;
      if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id, session?.access_token, access?.hasAccess, access?.hasFile]);

  // Progresso salvo
  useEffect(() => {
    if (!user || !access?.hasAccess) return;
    supabase.from("material_progress").select("progress_percent,last_page").eq("user_id", user.id).eq("material_id", id).maybeSingle()
      .then(({ data }) => { if (data?.last_page) setPage(data.last_page); });
    void persistProgress({ data: { materialId: id, page: 0, percent: 0 } }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, access?.hasAccess, id]);

  const savePage = async (p: number) => {
    if (!access?.hasAccess) return;
    const percent = totalPages ? Math.min(100, Math.round((p / totalPages) * 100)) : 0;
    try {
      await persistProgress({ data: { materialId: id, page: p, percent } });
      toast.success(`Progresso salvo — página ${p}${totalPages ? ` de ${totalPages}` : ""}`);
    } catch { toast.error("Não foi possível salvar o progresso"); }
  };

  const handleDownload = async () => {
    if (!user || !session) { toast.error("Faça login para baixar"); nav({ to: "/auth" }); return; }
    if (!access?.hasAccess) { toast.error("Você precisa adquirir este material"); return; }
    setDownloading(true);
    try {
      const blob = await fetchProtectedFile(session.access_token, id, "download");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${m.title.slice(0, 60).replace(/[^\w\s-]/g, "")}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      track("material_download", { entity_type: "material", entity_id: id });
      toast.success("Download iniciado — arquivo identificado com sua licença.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao baixar arquivo");
    } finally { setDownloading(false); }
  };

  const handleAcquire = async () => {
    if (!user) { toast.error("Faça login para continuar"); nav({ to: "/auth" }); return; }
    setBuying(true);
    try {
      const res = await acquire({ data: { materialId: id } });
      if (res.status === "pago") {
        toast.success(`Material liberado! Licença ${res.license}`);
        await refreshAccess();
      } else if (res.status === "pendente") {
        toast.info("Compra registrada como pendente. O acesso é liberado assim que o pagamento for confirmado.");
      }
    } catch (e: any) {
      toast.error("Não foi possível registrar a aquisição");
      console.error(e);
    } finally { setBuying(false); }
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

  const isPaid = Number(m.price) > 0;
  const unlocked = !!access?.hasAccess;

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
            {m.description && <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{m.description}</p>}

            {!!m.topics?.length && (
              <div className="flex flex-wrap gap-1.5 mb-6">
                {m.topics.map((t: string) => (
                  <Link key={t} to="/marketplace" search={{ subject: m.subject }}
                    className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground hover:border-primary/60 hover:text-primary transition">
                    #{t}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-6 mb-6 text-sm">
              <button onClick={toggle} disabled={busy} className={cn("flex items-center gap-1.5 hover:text-primary transition", liked && "text-primary")}>
                <Heart className={cn("h-4 w-4", liked && "fill-current")} /> {likes}
              </button>
              <FavoriteButton materialId={id} count={m.saves_count ?? 0} compact />
              <span className="flex items-center gap-1.5 text-muted-foreground"><MessageCircle className="h-4 w-4" /> {m.comments_count ?? 0}</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><Download className="h-4 w-4" /> {m.downloads}</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><Star className="h-4 w-4 text-warning" /> {Number(m.rating).toFixed(1)}</span>
              <div className="ml-auto"><ReportDialog targetType="material" targetId={id} /></div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/50">
              <div>
                <div className="text-2xl font-bold">
                  {!isPaid ? <span className="text-primary">Grátis</span> : `R$ ${Number(m.price).toFixed(2)}`}
                </div>
                {access?.license && (
                  <div className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-success" /> Licença <code className="bg-secondary/60 px-1 rounded">{access.license}</code>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <FavoriteButton materialId={id} />
                {accessLoading && user ? (
                  <Button size="lg" disabled><Loader2 className="h-4 w-4 animate-spin" /></Button>
                ) : unlocked ? (
                  <Button onClick={handleDownload} disabled={downloading} size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow">
                    {downloading ? "Preparando..." : (<><Download className="h-4 w-4 mr-2" /> Baixar</>)}
                  </Button>
                ) : (
                  <Button onClick={handleAcquire} disabled={buying} size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow">
                    {buying ? "Processando..." : isPaid ? (<><ShoppingCart className="h-4 w-4 mr-2" /> Comprar material</>) : (<><Download className="h-4 w-4 mr-2" /> Obter grátis</>)}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {access?.hasFile && (
          <div className="glass-strong rounded-3xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-semibold flex items-center gap-2">
                {unlocked ? "Material completo" : (<><Lock className="h-4 w-4 text-warning" /> Prévia limitada</>)}
              </h2>
              {unlocked && totalPages && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Página</span>
                  <Input type="number" min={1} max={totalPages} value={page}
                    onChange={(e) => setPage(Math.min(totalPages, Math.max(1, Number(e.target.value) || 1)))}
                    className="h-8 w-20" />
                  <span className="text-muted-foreground">de {totalPages}</span>
                  <Button size="sm" variant="outline" onClick={() => savePage(page)}>Salvar progresso</Button>
                </div>
              )}
            </div>
            {previewError ? (
              <div className="p-8 text-center text-sm text-muted-foreground">{previewError}</div>
            ) : !blobUrl ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <>
                <object data={`${blobUrl}#page=${page}&toolbar=1&view=FitH`} type="application/pdf" className="w-full h-[80vh] bg-background">
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Seu navegador bloqueou o visualizador de PDF. Use o botão de download.
                  </div>
                </object>
                {!unlocked && (
                  <div className="p-5 text-center border-t border-border/50">
                    <p className="text-sm text-muted-foreground mb-3">
                      Você está vendo apenas {access?.previewPages ?? 1} página(s) de prévia.
                    </p>
                    <Button onClick={handleAcquire} disabled={buying} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                      <ShoppingCart className="h-4 w-4 mr-2" /> {isPaid ? "Comprar material" : "Obter grátis"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!user && (
          <div className="glass rounded-2xl p-5 mb-6 text-sm text-muted-foreground text-center">
            <Lock className="h-5 w-5 mx-auto mb-2 text-primary" />
            Entre na sua conta para visualizar a prévia e acessar o material.
            <div className="mt-3"><Link to="/auth"><Button size="sm">Entrar</Button></Link></div>
          </div>
        )}

        {m.profiles && (
          <Link to="/u/$username" params={{ username: m.profiles.username }} className="glass rounded-2xl p-5 flex items-center gap-4 mb-6 hover:border-primary/40 transition">
            <Avatar className="h-14 w-14 ring-2 ring-primary/30">
              <AvatarImage src={m.profiles.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                {(m.profiles.full_name ?? m.profiles.username ?? "U").slice(0,2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold flex items-center gap-2 flex-wrap">
                {m.profiles.full_name ?? m.profiles.username}
                <TeacherBadge p={m.profiles} showDetails={false} />
              </div>
              <div className="text-xs text-muted-foreground">@{m.profiles.username} · Nível {m.profiles.level} · Trust {Number(m.profiles.trust_score).toFixed(1)}</div>
              <TeacherBadge p={m.profiles} className="mt-1" />
            </div>
            <span className="text-xs text-primary">Ver perfil →</span>
          </Link>
        )}

        <CommentThread materialId={id} materialAuthorId={m.author_id} />
      </div>
    </div>
  );
}
