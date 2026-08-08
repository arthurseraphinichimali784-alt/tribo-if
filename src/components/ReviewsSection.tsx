import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { listReviews, upsertReview, myReview } from "@/lib/reviews.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReviewRow {
  id: string;
  rating: number;
  quality: number | null;
  clarity: number | null;
  value_rating: number | null;
  comment: string | null;
  verified_purchase: boolean;
  created_at: string;
  profile: { username: string; avatar_url: string | null } | null;
}

function Stars({ value, onChange, size = 18 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
          onClick={onChange ? () => onChange(n) : undefined}
          className={cn(onChange && "hover:scale-110 transition")}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= value ? "fill-warning text-warning" : "text-muted-foreground/40"}
          />
        </button>
      ))}
    </div>
  );
}

/** Avaliações com compra verificada — só quem adquiriu consegue avaliar. */
export function ReviewsSection({ materialId, kitId }: { materialId?: string; kitId?: string }) {
  const { user } = useAuth();
  const fetchList = useServerFn(listReviews);
  const fetchMine = useServerFn(myReview);
  const save = useServerFn(upsertReview);

  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [quality, setQuality] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const target = { materialId, kitId };

  async function reload() {
    const res = await fetchList({ data: target });
    setReviews(res as unknown as ReviewRow[]);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchList({ data: target });
        if (!cancelled) setReviews(res as unknown as ReviewRow[]);
        if (user) {
          const mine = await fetchMine({ data: target });
          if (!cancelled && mine) {
            setRating(mine.rating);
            setQuality(mine.quality ?? 0);
            setClarity(mine.clarity ?? 0);
            setValueRating(mine.value_rating ?? 0);
            setComment(mine.comment ?? "");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId, kitId, user?.id]);

  async function submit() {
    if (rating < 1) { toast.error("Escolha uma nota de 1 a 5."); return; }
    setSaving(true);
    try {
      await save({ data: { ...target, rating, quality: quality || undefined, clarity: clarity || undefined, valueRating: valueRating || undefined, comment } });
      toast.success("Avaliação enviada. Obrigado!");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Só é possível avaliar produtos que você adquiriu.");
    }
    setSaving(false);
  }

  const average = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return (
    <section className="glass rounded-2xl p-6 space-y-5">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-bold">⭐ Avaliações</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Stars value={Math.round(average)} />
            <span className="font-semibold">{average.toFixed(1)}/5</span>
            <span className="text-muted-foreground">{reviews.length} avaliações</span>
          </div>
        )}
      </header>

      {user && (
        <div className="rounded-xl border border-border/50 p-4 space-y-3">
          <p className="text-sm font-medium">Sua avaliação</p>
          <div className="flex flex-wrap gap-4">
            <label className="text-xs text-muted-foreground space-y-1">
              <span className="block">Nota geral</span>
              <Stars value={rating} onChange={setRating} />
            </label>
            <label className="text-xs text-muted-foreground space-y-1">
              <span className="block">Qualidade</span>
              <Stars value={quality} onChange={setQuality} size={15} />
            </label>
            <label className="text-xs text-muted-foreground space-y-1">
              <span className="block">Explicação</span>
              <Stars value={clarity} onChange={setClarity} size={15} />
            </label>
            <label className="text-xs text-muted-foreground space-y-1">
              <span className="block">Custo-benefício</span>
              <Stars value={valueRating} onChange={setValueRating} size={15} />
            </label>
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte o que achou (opcional)"
            maxLength={1000}
            rows={3}
          />
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Enviar avaliação
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não há avaliações. Seja a primeira pessoa a avaliar.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-border/40 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{r.profile?.username ?? "Usuário"}</span>
                <Stars value={r.rating} size={14} />
                {r.verified_purchase && (
                  <span className="text-[10px] rounded-full bg-success/15 text-success border border-success/30 px-1.5 py-0.5 font-semibold">
                    🛒 Compra verificada
                  </span>
                )}
              </div>
              {r.comment && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
