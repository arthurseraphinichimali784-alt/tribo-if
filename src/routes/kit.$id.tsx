import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getKit, type KitDetail } from "@/lib/kits.functions";
import { createCheckout } from "@/lib/checkout.functions";
import { KitBadge, ContentTypeBadge, TagChips, DifficultyBadge, LevelBadge } from "@/components/ContentTags";
import { TeacherBadge } from "@/components/TeacherBadge";
import { ReviewsSection } from "@/components/ReviewsSection";
import { subjectEmoji, subjectLabel } from "@/lib/constants";
import { Loader2, Package, ShoppingCart, Check, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/kit/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Kit de estudos | StudyHub IF" },
      { name: "description", content: "Veja tudo o que está incluído neste kit de estudos e quanto você economiza comprando em conjunto." },
      { property: "og:title", content: "Kit de estudos | StudyHub IF" },
      { property: "og:description", content: "Materiais, videoaulas, exercícios e simulados reunidos em um único kit." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KitPage,
});

function KitPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const fetchKit = useServerFn(getKit);
  const buyKit = useServerFn(createCheckout);
  const [data, setData] = useState<KitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchKit({ data: { kitId: id } });
        if (!cancelled) setData(res as KitDetail | null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleBuy() {
    if (!user) { void nav({ to: "/auth" }); return; }
    setBuying(true);
    try {
      const res = await buyKit({ data: { kitId: id, origin: window.location.origin } });
      if (res.status === "pago") toast.success("Kit liberado! Ele já está na sua biblioteca.");
      else if (res.status === "autor") toast.info("Este kit é seu.");
      else if (res.url) {
        toast.info("Redirecionando para o pagamento (Pix ou cartão)...");
        window.location.href = res.url;
      } else toast.info("Compra pendente. Assim que o pagamento for confirmado o acesso é liberado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível concluir agora.");
    }
    setBuying(false);
  }


  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container max-w-3xl py-20 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="text-xl font-bold">Kit não encontrado</h1>
          <Link to="/kits" className="text-primary hover:underline text-sm mt-2 inline-block">Ver todos os kits</Link>
        </main>
      </div>
    );
  }

  const { kit, author, items, individualTotal, savings } = data;

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <main className="container max-w-5xl py-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="glass rounded-2xl overflow-hidden">
            <div className="h-40 bg-gradient-to-br from-accent/25 to-primary/20 flex items-center justify-center text-5xl">
              {kit.cover_url ? (
                <img src={kit.cover_url} alt={`Capa do ${kit.title}`} className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden>{kit.subject ? subjectEmoji(kit.subject) : "📦"}</span>
              )}
            </div>
            <div className="p-6 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <KitBadge />
                <LevelBadge value={kit.level} />
                <DifficultyBadge value={kit.difficulty} />
                {kit.subject && <span className="text-xs text-muted-foreground">{subjectLabel(kit.subject)}</span>}
              </div>
              <h1 className="text-2xl font-bold">{kit.title}</h1>
              {kit.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{kit.description}</p>}
              <TagChips tags={kit.topics} max={10} />
              {author && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-3">
                  <span className="text-sm text-muted-foreground">Por</span>
                  <Link to="/u/$username" params={{ username: author.username }} className="text-sm font-medium hover:text-primary">
                    {author.full_name ?? author.username}
                  </Link>
                  <TeacherBadge p={author} showDetails={false} />
                </div>
              )}
              {kit.rating_count > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="font-semibold">{Number(kit.rating).toFixed(1)}</span>
                  <span className="text-muted-foreground">/5 • {kit.rating_count} avaliações</span>
                </div>
              )}
            </div>
          </div>

          <section className="glass rounded-2xl p-6">
            <h2 className="font-bold mb-3">📦 Este kit contém {items.length} {items.length === 1 ? "material" : "materiais"}</h2>
            <ul className="space-y-2">
              {items.map((m) => (
                <li key={m.id}>
                  <Link
                    to="/material/$id"
                    params={{ id: m.id }}
                    className="flex items-center gap-3 rounded-xl border border-border/50 p-3 hover:border-primary/50 transition"
                  >
                    <span className="text-xl" aria-hidden>{subjectEmoji(m.subject)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">{m.title}</span>
                      <ContentTypeBadge type={m.type} className="mt-1" />
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {Number(m.price) > 0 ? `R$ ${Number(m.price).toFixed(2)}` : "Grátis"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <ReviewsSection kitId={kit.id} />
        </div>

        <aside className="lg:sticky lg:top-24 h-fit space-y-3">
          <div className="glass rounded-2xl p-5 space-y-3">
            {savings > 0 && (
              <p className="text-xs text-muted-foreground line-through">Separado: R$ {individualTotal.toFixed(2)}</p>
            )}
            <p className="text-3xl font-bold text-primary">
              {Number(kit.price) > 0 ? `R$ ${Number(kit.price).toFixed(2)}` : "Grátis"}
            </p>
            {savings > 0 && (
              <p className="text-sm font-semibold text-success flex items-center gap-1">
                <Check className="h-4 w-4" /> Você economiza R$ {savings.toFixed(2)}
              </p>
            )}
            <Button className="w-full btn-glow" onClick={handleBuy} disabled={buying}>
              {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-1" />}
              {Number(kit.price) > 0 ? "Comprar kit" : "Obter grátis"}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              A liberação do acesso acontece somente após a confirmação real do pagamento.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
