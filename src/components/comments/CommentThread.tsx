import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Pin, MessageCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

interface CommentRow {
  id: string;
  body: string;
  user_id: string;
  parent_id: string | null;
  likes: number;
  is_pinned: boolean;
  created_at: string;
  profiles: { username: string; avatar_url: string | null; full_name: string | null; level: number; trust_score: number } | null;
  liked_by_me?: boolean;
}

const RELEVANCE_DECAY_HOURS = 72;

function relevance(c: CommentRow): number {
  // Pinned always first; then likes weighted with mild recency decay
  const ageHours = (Date.now() - new Date(c.created_at).getTime()) / 3_600_000;
  const recencyBoost = Math.max(0, 1 - ageHours / RELEVANCE_DECAY_HOURS);
  return (c.is_pinned ? 1000 : 0) + c.likes * 2 + recencyBoost;
}

export function CommentThread({ materialId, materialAuthorId }: { materialId: string; materialAuthorId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("comments")
      .select("id,body,user_id,parent_id,likes,is_pinned,created_at,profiles(username,avatar_url,full_name,level,trust_score)")
      .eq("material_id", materialId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    let likedSet = new Set<string>();
    if (user && data?.length) {
      const { data: liked } = await supabase
        .from("comment_likes")
        .select("comment_id")
        .eq("user_id", user.id)
        .in("comment_id", data.map((c: any) => c.id));
      likedSet = new Set((liked ?? []).map((l: any) => l.comment_id));
    }
    setItems(((data ?? []) as any[]).map((c) => ({ ...c, liked_by_me: likedSet.has(c.id) })) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`comments-${materialId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `material_id=eq.${materialId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "comment_likes" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId, user?.id]);

  const submit = async () => {
    if (!user) { toast.error("Faça login para comentar"); return; }
    const text = body.trim();
    if (text.length < 3) { toast.error("Comentário muito curto"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      material_id: materialId,
      user_id: user.id,
      parent_id: replyTo,
      body: text,
    });
    setSubmitting(false);
    if (error) { toast.error("Erro ao publicar"); return; }
    track("comment_create", { entity_type: "material", entity_id: materialId });
    setBody(""); setReplyTo(null);
  };

  const toggleLike = async (c: CommentRow) => {
    if (!user) { toast.error("Faça login para curtir"); return; }
    if (c.liked_by_me) {
      await supabase.from("comment_likes").delete().eq("comment_id", c.id).eq("user_id", user.id);
    } else {
      await supabase.from("comment_likes").insert({ comment_id: c.id, user_id: user.id });
    }
  };

  const togglePin = async (c: CommentRow) => {
    if (user?.id !== materialAuthorId) return;
    await supabase.from("comments").update({ is_pinned: !c.is_pinned }).eq("id", c.id);
  };

  const roots = [...items.filter((c) => !c.parent_id)].sort((a, b) => relevance(b) - relevance(a));
  const repliesOf = (id: string) => items.filter((c) => c.parent_id === id).sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));

  return (
    <div className="glass-strong rounded-3xl p-6 md:p-8">
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-lg">Discussão acadêmica</h2>
        <span className="text-xs text-muted-foreground">· comentários úteis sobem ao topo</span>
      </div>

      <div className="mb-6">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={replyTo ? "Escreva sua resposta..." : "Compartilhe uma explicação, correção, dica de prova..."}
          rows={3}
          maxLength={4000}
        />
        <div className="flex items-center justify-between mt-2">
          {replyTo && <button onClick={() => setReplyTo(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar resposta</button>}
          <div className="ml-auto flex gap-2">
            <span className="text-xs text-muted-foreground self-center">{body.length}/4000</span>
            <Button onClick={submit} disabled={submitting || body.trim().length < 3} size="sm">
              {submitting ? "Enviando..." : (replyTo ? "Responder" : "Comentar")}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : roots.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Nenhuma discussão ainda. Seja o primeiro a contribuir com uma explicação útil.
        </div>
      ) : (
        <div className="space-y-5">
          {roots.map((c) => (
            <div key={c.id}>
              <CommentItem c={c} onLike={toggleLike} onReply={() => setReplyTo(c.id)} onPin={() => togglePin(c)} canPin={user?.id === materialAuthorId} />
              {repliesOf(c.id).length > 0 && (
                <div className="ml-12 mt-3 space-y-3 border-l-2 border-border/40 pl-4">
                  {repliesOf(c.id).map((r) => (
                    <CommentItem key={r.id} c={r} onLike={toggleLike} reply />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({ c, onLike, onReply, onPin, canPin, reply }: {
  c: CommentRow; onLike: (c: CommentRow) => void; onReply?: () => void; onPin?: () => void; canPin?: boolean; reply?: boolean;
}) {
  const name = c.profiles?.full_name ?? c.profiles?.username ?? "Usuário";
  return (
    <div className={cn("flex gap-3", c.is_pinned && "ring-1 ring-primary/30 rounded-2xl p-3 bg-primary/5")}>
      <Avatar className={reply ? "h-8 w-8" : "h-10 w-10"}>
        <AvatarImage src={c.profiles?.avatar_url ?? undefined} />
        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-bold">
          {name.slice(0,2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="font-medium">{name}</span>
          {c.profiles && <span className="text-xs text-muted-foreground">Nv {c.profiles.level} · Trust {Number(c.profiles.trust_score).toFixed(0)}</span>}
          {c.is_pinned && <span className="text-xs text-primary flex items-center gap-1"><Pin className="h-3 w-3" /> Destaque</span>}
        </div>
        <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.body}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <button onClick={() => onLike(c)} className={cn("flex items-center gap-1 hover:text-primary transition", c.liked_by_me && "text-primary")}>
            <Heart className={cn("h-3 w-3", c.liked_by_me && "fill-current")} /> {c.likes}
          </button>
          {onReply && <button onClick={onReply} className="hover:text-foreground transition">Responder</button>}
          {canPin && onPin && <button onClick={onPin} className="hover:text-foreground transition flex items-center gap-1"><Pin className="h-3 w-3" /> {c.is_pinned ? "Remover destaque" : "Destacar"}</button>}
        </div>
      </div>
    </div>
  );
}
