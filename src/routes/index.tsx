import { createFileRoute, Link } from "@tanstack/react-router";

import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { MaterialCard, type MaterialItem } from "@/components/MaterialCard";
import { MaterialSkeleton } from "@/components/MaterialSkeleton";
import { getRecommendations, getTrending, getActivity } from "@/lib/recommendations.functions";
import { ArrowRight, Sparkles, TrendingUp, Activity, Compass, Heart, Bookmark, MessageCircle, Eye } from "lucide-react";
import { SUBJECTS, subjectLabel } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user } = useAuth();

  const fetchRecs = useServerFn(getRecommendations);
  const fetchTrending = useServerFn(getTrending);
  const fetchActivity = useServerFn(getActivity);

  const recs = useQuery({
    queryKey: ["recs", user?.id ?? "anon"],
    queryFn: () => fetchRecs({ data: { userId: user?.id, limit: 8 } }),
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

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <div className="container mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 text-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Construído por estudantes, para estudantes dos IFs</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-5 leading-tight">
            Sua aprovação no <br />
            <span className="text-gradient">Instituto Federal</span> começa aqui
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Resumos, flashcards e simulados feitos por quem já passou.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/marketplace">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow h-12 px-6">
                Explorar materiais <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            {!user && (
              <Link to="/auth"><Button size="lg" variant="outline" className="h-12 px-6">Criar conta grátis</Button></Link>
            )}
          </div>
        </div>
      </section>

      {/* Recommended */}
      <Section
        icon={Compass}
        title={user ? (recs.data?.reason === "personalized" ? "Recomendado para você" : "Em alta") : "Em alta agora"}
        subtitle={user && recs.data?.reason === "personalized" ? `Baseado nas matérias que você mais estuda` : "Conteúdos populares na comunidade"}
      >
        <Grid loading={recs.isLoading} items={(recs.data?.items ?? []) as MaterialItem[]} empty="Sem recomendações ainda. Comece explorando o marketplace." />
      </Section>

      {/* Trending */}
      <Section icon={TrendingUp} title="Em alta esta semana" subtitle="Materiais mais curtidos e baixados nos últimos 7 dias">
        <Grid loading={trending.isLoading} items={(trending.data ?? []) as MaterialItem[]} empty="Ainda não há tendências." />
      </Section>

      {/* Subjects */}
      <section className="container mx-auto px-4 py-10">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Estude por matéria</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {SUBJECTS.map((s) => (
            <Link
              key={s.value}
              to="/marketplace"
              search={{ subject: s.value } as any}
              className="glass rounded-2xl p-5 text-center hover:border-primary/50 hover:scale-[1.03] transition-all group"
            >
              <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">{s.emoji}</div>
              <div className="font-semibold text-sm">{s.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Community activity */}
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-2xl md:text-3xl font-bold">Atividade da comunidade</h2>
        </div>
        <div className="glass rounded-2xl divide-y divide-border/40">
          {activity.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
          ) : !activity.data || activity.data.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">Sem atividade recente.</div>
          ) : activity.data.map((e: any) => <ActivityRow key={e.id} e={e} />)}
        </div>
      </section>

      <footer className="container mx-auto px-4 py-10 text-center text-sm text-muted-foreground">
        © 2026 StudyHub IF · Feito com 💚 para estudantes brasileiros
      </footer>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="container mx-auto px-4 py-10">
      <div className="flex items-end justify-between mb-5 flex-wrap gap-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Icon className="h-6 w-6 text-primary" /> {title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <Link to="/marketplace"><Button variant="ghost" size="sm">Ver tudo <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
      </div>
      {children}
    </section>
  );
}

function Grid({ loading, items, empty }: { loading: boolean; items: MaterialItem[]; empty: string }) {
  if (loading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{Array.from({ length: 4 }).map((_, i) => <MaterialSkeleton key={i} />)}</div>;
  if (!items.length) return <div className="glass rounded-2xl p-10 text-center text-muted-foreground">{empty}</div>;
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{items.map((m) => <MaterialCard key={m.id} m={m} />)}</div>;
}

const EVENT_LABELS: Record<string, { icon: any; verb: string }> = {
  material_like: { icon: Heart, verb: "curtiu" },
  material_save: { icon: Bookmark, verb: "salvou" },
  comment_create: { icon: MessageCircle, verb: "comentou em" },
  material_view: { icon: Eye, verb: "leu" },
};

function ActivityRow({ e }: { e: any }) {
  const cfg = EVENT_LABELS[e.event_type] ?? { icon: Activity, verb: e.event_type };
  const Icon = cfg.icon;
  const who = e.profiles?.username ?? "Alguém";
  const when = formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR });
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 text-sm">
        <span className="font-medium">@{who}</span>
        <span className="text-muted-foreground"> {cfg.verb} </span>
        {e.material ? (
          <Link to="/material/$id" params={{ id: e.material.id }} className="font-medium hover:text-primary truncate">
            {e.material.title}
          </Link>
        ) : <span className="italic text-muted-foreground">um material</span>}
        {e.material?.subject && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{subjectLabel(e.material.subject)}</span>}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{when}</span>
    </div>
  );
}
