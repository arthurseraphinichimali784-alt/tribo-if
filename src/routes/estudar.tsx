import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { listTracks, getTrack, getMyTopicProgress, setTopicProgress, getStudyPlan, type TrackDetail, type StudyPlanItem } from "@/lib/study.functions";
import { subjectEmoji, subjectLabel, PROGRESS_STATUS } from "@/lib/constants";
import { ContentTypeBadge } from "@/components/ContentTags";
import { StudyAssist } from "@/components/StudyAssist";
import { Loader2, Target, Compass } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/estudar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "O que estudar agora | StudyHub IF" },
      { name: "description", content: "Trilhas de preparação para o Instituto Federal, progresso por assunto e recomendações personalizadas do que estudar em seguida." },
      { property: "og:title", content: "O que estudar agora | StudyHub IF" },
      { property: "og:description", content: "Descubra o próximo assunto a estudar com base no seu desempenho e acompanhe seu progresso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudyPage,
});

type TrackRow = { id: string; slug: string; title: string; description: string | null; institution: string | null };
type ProgressRow = { subject: string; topic: string; status: string; percent: number };

function StudyPage() {
  const { user } = useAuth();
  const fetchTracks = useServerFn(listTracks);
  const fetchTrack = useServerFn(getTrack);
  const fetchProgress = useServerFn(getMyTopicProgress);
  const saveProgress = useServerFn(setTopicProgress);
  const fetchPlan = useServerFn(getStudyPlan);

  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<TrackDetail | null>(null);
  const [progress, setProgress] = useState<Record<string, ProgressRow>>({});
  const [plan, setPlan] = useState<StudyPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const t = (await fetchTracks()) as unknown as TrackRow[];
      if (cancelled) return;
      setTracks(t);
      setSlug(t[0]?.slug ?? null);
      if (user) {
        const [p, sp] = await Promise.all([fetchProgress(), fetchPlan()]);
        if (cancelled) return;
        const map: Record<string, ProgressRow> = {};
        (p as unknown as ProgressRow[]).forEach((r) => { map[`${r.subject}::${r.topic}`] = r; });
        setProgress(map);
        setPlan(sp.items);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void (async () => {
      const d = await fetchTrack({ data: { slug } });
      if (!cancelled) setDetail(d as TrackDetail | null);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function cycleStatus(subject: string, topic: string) {
    if (!user) { toast.info("Entre para acompanhar seu progresso."); return; }
    const key = `${subject}::${topic}`;
    const current = progress[key]?.status ?? "nao_iniciado";
    const next = current === "nao_iniciado" ? "em_andamento" : current === "em_andamento" ? "concluido" : "nao_iniciado";
    setProgress((p) => ({ ...p, [key]: { subject, topic, status: next, percent: next === "concluido" ? 100 : next === "em_andamento" ? 50 : 0 } }));
    try {
      await saveProgress({ data: { subject, topic, status: next } });
    } catch {
      toast.error("Não consegui salvar seu progresso agora.");
    }
  }

  const allTopics = detail?.subjects.flatMap((s) => s.topics.map((t) => `${s.subject}::${t.topic}`)) ?? [];
  const done = allTopics.filter((k) => progress[k]?.status === "concluido").length;
  const overall = allTopics.length ? Math.round((done / allTopics.length) * 100) : 0;

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <main className="container max-w-5xl py-8 space-y-8">
        <header>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Compass className="h-7 w-7 text-primary" /> O que estudar agora
          </h1>
          <p className="text-muted-foreground mt-1">
            Siga uma trilha de preparação, marque seu progresso e receba recomendações do próximo passo.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            {user && plan.length > 0 && (
              <section className="glass rounded-2xl p-6 space-y-4">
                <h2 className="font-bold flex items-center gap-2">🎯 Recomendação para você</h2>
                {plan.map((item) => (
                  <div key={`${item.subject}-${item.topic}`} className="rounded-xl border border-border/50 p-4 space-y-3">
                    <div>
                      <p className="font-semibold">
                        {subjectEmoji(item.subject)} {item.topic}
                        {item.percent !== null && <span className="ml-2 text-sm text-destructive">{item.percent}%</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.reason}</p>
                    </div>
                    {item.materials.length > 0 && (
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {item.materials.map((m) => (
                          <li key={m.id}>
                            <Link to="/material/$id" params={{ id: m.id }} className="flex items-center gap-2 rounded-lg border border-border/40 p-2 hover:border-primary/50 transition">
                              <span className="text-sm truncate flex-1">{m.title}</span>
                              <ContentTypeBadge type={m.type} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.sets.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.sets.map((s) => (
                          <Link key={s.id} to="/simulado/$id" params={{ id: s.id }}>
                            <Button size="sm" variant="secondary">📝 {s.title}</Button>
                          </Link>
                        ))}
                      </div>
                    )}
                    <StudyAssist subject={item.subject} topic={item.topic} actions={["estudar_assunto", "mais_simples"]} />
                  </div>
                ))}
              </section>
            )}

            {tracks.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Target className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold">Nenhuma trilha publicada ainda</p>
                <p className="text-sm text-muted-foreground">As trilhas de prova são criadas pela equipe do StudyHUB.</p>
              </div>
            ) : (
              <section className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {tracks.map((t) => (
                    <Button key={t.id} size="sm" variant={t.slug === slug ? "default" : "outline"} onClick={() => setSlug(t.slug)}>
                      🎯 {t.title}
                    </Button>
                  ))}
                </div>

                {detail && (
                  <div className="glass rounded-2xl p-6 space-y-5">
                    <div>
                      <h2 className="text-xl font-bold">{detail.track.title}</h2>
                      {detail.track.description && <p className="text-sm text-muted-foreground">{detail.track.description}</p>}
                      {user && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progresso geral</span><span>{overall}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${overall}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {detail.subjects.map((s) => (
                      <div key={s.subject} className="space-y-2">
                        <h3 className="font-semibold text-sm">{subjectEmoji(s.subject)} {subjectLabel(s.subject)}</h3>
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {s.topics.map((t) => {
                            const st = progress[`${s.subject}::${t.topic}`]?.status ?? "nao_iniciado";
                            const meta = PROGRESS_STATUS[st as keyof typeof PROGRESS_STATUS];
                            return (
                              <li key={t.topic}>
                                <button
                                  type="button"
                                  onClick={() => cycleStatus(s.subject, t.topic)}
                                  className="w-full flex items-center gap-2 rounded-lg border border-border/50 p-2.5 text-left hover:border-primary/50 transition"
                                >
                                  <span aria-hidden>{meta.emoji}</span>
                                  <span className="flex-1 text-sm">{t.topic}</span>
                                  <span className="text-[10px] text-muted-foreground">{meta.label}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
