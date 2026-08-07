import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Heart, Bookmark, MessageCircle, FileText, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getActivity } from "@/lib/recommendations.functions";
import { subjectLabel } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const EVENT_CFG: Record<string, { icon: any; verb: string; tone: string }> = {
  material_like: { icon: Heart, verb: "curtiu", tone: "text-rose-400 bg-rose-400/10" },
  material_save: { icon: Bookmark, verb: "salvou", tone: "text-amber-400 bg-amber-400/10" },
  comment_create: { icon: MessageCircle, verb: "comentou em", tone: "text-sky-400 bg-sky-400/10" },
  material_publish: { icon: FileText, verb: "publicou", tone: "text-emerald-400 bg-emerald-400/10" },
  material_view: { icon: Eye, verb: "viu", tone: "text-violet-400 bg-violet-400/10" },
};

const FILTERS = [
  { id: "all", label: "Tudo", types: null as string[] | null },
  { id: "social", label: "Social", types: ["material_like", "material_save", "comment_create"] },
  { id: "new", label: "Novos", types: ["material_publish"] },
];

export function ActivityFeed() {
  const [filter, setFilter] = useState("all");
  const fetchActivity = useServerFn(getActivity);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["activity"],
    queryFn: () => fetchActivity({ data: { limit: 20 } }),
    refetchInterval: 45_000,
  });

  const active = FILTERS.find((f) => f.id === filter)!;
  const items = ((data ?? []) as any[]).filter((e) => !active.types || active.types.includes(e.event_type));

  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={cn("absolute inline-flex h-full w-full rounded-full bg-primary opacity-75", isFetching && "animate-ping")} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <h3 className="font-semibold">Atividade recente</h3>
        </div>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex gap-1 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium transition",
              filter === f.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary/50",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-1 max-h-[420px] overflow-y-auto -mr-2 pr-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-secondary/30 animate-pulse" />)
        ) : items.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-2xl mb-1">👀</div>
            <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Seja o primeiro a curtir ou publicar algo.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((e: any) => <ActivityRow key={e.id} e={e} />)}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}

function ActivityRow({ e }: { e: any }) {
  const cfg = EVENT_CFG[e.event_type] ?? { icon: Activity, verb: e.event_type, tone: "text-primary bg-primary/10" };
  const Icon = cfg.icon;
  const who = e.profiles?.username ?? "Alguém";
  const when = formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-secondary/30 transition"
    >
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={e.profiles?.avatar_url ?? undefined} alt={who} />
          <AvatarFallback className="text-[10px]">{who.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className={cn("absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-background", cfg.tone)}>
          <Icon className="h-2.5 w-2.5" />
        </span>
      </div>
      <div className="flex-1 min-w-0 text-xs">
        <div className="leading-tight">
          {e.profiles?.username ? (
            <Link to="/u/$username" params={{ username: e.profiles.username }} className="font-semibold hover:text-primary">@{who}</Link>
          ) : <span className="font-semibold">@{who}</span>}
          <span className="text-muted-foreground"> {cfg.verb} </span>
        </div>
        {e.material && (
          <Link to="/material/$id" params={{ id: e.material.id }} className="text-[11px] font-medium hover:text-primary line-clamp-1 block">
            {e.material.title}
          </Link>
        )}
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {e.material?.subject && <span className="mr-1.5">{subjectLabel(e.material.subject)} ·</span>}
          {when}
        </div>
      </div>
    </motion.div>
  );
}
