import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { MaterialCard, type MaterialItem } from "@/components/MaterialCard";
import { MaterialSkeleton } from "@/components/MaterialSkeleton";
import { HeroLogged } from "@/components/home/HeroLogged";
import { QuickActions } from "@/components/home/QuickActions";
import { Leaderboard } from "@/components/home/Leaderboard";
import { getRecommendations, getPublicTrending, getTrending, getActivity } from "@/lib/recommendations.functions";
import { ArrowRight, Sparkles, TrendingUp, Activity, Compass, Heart, Bookmark, MessageCircle, FileText } from "lucide-react";
import { SUBJECTS, subjectLabel } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user } = useAuth();
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!user) { setUsername(""); return; }
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? ""));
  }, [user]);

  const fetchRecs = useServerFn(getRecommendations);
  const fetchPublicTrending = useServerFn(getPublicTrending);
  const fetchTrending = useServerFn(getTrending);
  const fetchActivity = useServerFn(getActivity);

  const recs = useQuery({
    queryKey: ["recs", user?.id ?? "anon"],
    queryFn: () => user?.id
      ? fetchRecs({ data: { limit: 8 } })
      : fetchPublicTrending({ data: { limit: 8 } }),
  });
  const trending = useQuery({
    queryKey: ["trending"],
    queryFn: () => fetchTrending({ data: { limit: 8 } }),
  });
  const activity = useQuery({
    queryKey: ["activity"],
    queryFn: () => fetchActivity({ data: { limit: 8 } }),
    refetchInterval: 60_000,
  });

  return (
    <div className="min-h-screen">
      <Header />

      {user ? (
        <HeroLogged userId={user.id} name={username || "estudante"} />
      ) : (
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
          <div className="container mx-auto px-4 py-16 md:py-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 text-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Construído por estudantes, para estudantes dos IFs</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold mb-5 leading-tight"
            >
              Sua aprovação no <br />
              <span className="text-gradient">Instituto Federal</span> começa aqui
            </motion.h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Resumos, flashcards e simulados feitos por quem já passou. Ganhe XP, suba de nível e construa sua reputação.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/marketplace">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow h-12 px-6">
                  Explorar materiais <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth" search={{ mode: "signup" } as any}>
                <Button size="lg" variant="outline" className="h-12 px-6">Criar conta grátis</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      <QuickActions />

      <div className="container mx-auto px-4 grid lg:grid-cols-[1fr_300px] gap-6 pb-10">
        <main className="space-y-10 min-w-0">
          <Section
            icon={Compass}
            title={user && recs.data?.reason === "personalized" ? "Recomendado pra você" : "Em alta agora"}
            subtitle={user && recs.data?.reason === "personalized" ? "Baseado nas matérias que você mais estuda" : "Conteúdos populares na comunidade"}
          >
            <Grid loading={recs.isLoading} items={(recs.data?.items ?? []) as MaterialItem[]} emptyIcon={Compass} emptyTitle="Sem recomendações ainda" emptyDesc="Curta seus primeiros materiais para destravar sugestões personalizadas." />
          </Section>

          <Section icon={TrendingUp} title="Em alta esta semana" subtitle="Mais curtidos e baixados nos últimos 7 dias">
            <Grid loading={trending.isLoading} items={(trending.data ?? []) as MaterialItem[]} emptyIcon={TrendingUp} emptyTitle="Ainda sem tendências" emptyDesc="A comunidade está aquecendo — volte em breve!" />
          </Section>

          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-5">Estude por matéria</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {SUBJECTS.map((s, i) => (
                <motion.div
                  key={s.value}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to="/marketplace"
                    search={{ subject: s.value } as any}
                    className="glass rounded-2xl p-5 text-center hover:border-primary/50 hover:scale-[1.03] transition-all group block"
                  >
                    <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">{s.emoji}</div>
                    <div className="font-semibold text-sm">{s.label}</div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <Leaderboard />
          <section className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Atividade recente</h3>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto -mr-2 pr-2">
              {activity.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-secondary/30 animate-pulse" />)
              ) : !activity.data || activity.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">Seja o primeiro a interagir 👀</p>
              ) : (
                activity.data.map((e: any) => <ActivityRow key={e.id} e={e} />)
              )}
            </div>
          </section>
        </aside>
      </div>

      <footer className="container mx-auto px-4 py-10 text-center text-sm text-muted-foreground">
        © 2026 StudyHub IF · Feito com 💚 para estudantes brasileiros
      </footer>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Icon className="h-6 w-6 text-primary" /> {title}
          </h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <Link to="/marketplace"><Button variant="ghost" size="sm">Ver tudo <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
      </div>
      {children}
    </section>
  );
}

function Grid({
  loading, items, emptyIcon: EmptyIcon, emptyTitle, emptyDesc,
}: { loading: boolean; items: MaterialItem[]; emptyIcon: any; emptyTitle: string; emptyDesc: string }) {
  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => <MaterialSkeleton key={i} />)}
    </div>
  );
  if (!items.length) return (
    <div className="glass rounded-2xl p-10 text-center">
      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mx-auto mb-3 flex items-center justify-center">
        <EmptyIcon className="h-7 w-7 text-primary" />
      </div>
      <div className="font-semibold">{emptyTitle}</div>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{emptyDesc}</p>
    </div>
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((m, i) => (
        <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <MaterialCard m={m} />
        </motion.div>
      ))}
    </div>
  );
}

const EVENT_LABELS: Record<string, { icon: any; verb: string }> = {
  material_like: { icon: Heart, verb: "curtiu" },
  material_save: { icon: Bookmark, verb: "salvou" },
  comment_create: { icon: MessageCircle, verb: "comentou em" },
  material_publish: { icon: FileText, verb: "publicou" },
};

function ActivityRow({ e }: { e: any }) {
  const cfg = EVENT_LABELS[e.event_type] ?? { icon: Activity, verb: e.event_type };
  const Icon = cfg.icon;
  const who = e.profiles?.username ?? "Alguém";
  const when = formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR });
  return (
    <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-secondary/30 transition">
      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-primary" />
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
    </div>
  );
}
