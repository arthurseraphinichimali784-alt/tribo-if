import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getQuiz, submitQuiz, type QuizQuestion, type QuizResult } from "@/lib/questions.functions";
import { StudyAssist } from "@/components/StudyAssist";
import { DifficultyBadge } from "@/components/ContentTags";
import { subjectEmoji } from "@/lib/constants";
import { Loader2, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/simulado/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Simulado | StudyHub IF" },
      { name: "description", content: "Responda o simulado, receba a correção comentada e veja seus pontos fortes e fracos por assunto." },
      { property: "og:title", content: "Simulado | StudyHub IF" },
      { property: "og:description", content: "Correção automática, gabarito comentado e análise de desempenho por assunto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuizPage,
});

function QuizPage() {
  const { id } = Route.useParams();
  const { user, ready } = useAuth();
  const nav = useNavigate();
  const fetchQuiz = useServerFn(getQuiz);
  const send = useServerFn(submitQuiz);

  const [set, setSet] = useState<{ title: string; description: string | null; time_limit_minutes: number | null } | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!user) { void nav({ to: "/auth" }); return; }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchQuiz({ data: { setId: id } });
        if (cancelled) return;
        setSet(res.set as typeof set);
        setQuestions(res.questions);
      } catch {
        if (!cancelled) toast.error("Simulado indisponível.");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id, id]);

  useEffect(() => {
    if (loading || result) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading, result]);

  async function finish() {
    setSending(true);
    try {
      const res = await send({
        data: { setId: id, answers: questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] ?? null })) },
      });
      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui enviar suas respostas.");
    }
    setSending(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen"><Header />
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen"><Header />
        <main className="container max-w-3xl py-20 text-center">
          <h1 className="text-xl font-bold">Simulado sem questões</h1>
          <Link to="/questoes" className="text-primary hover:underline text-sm">Ver outras listas</Link>
        </main>
      </div>
    );
  }

  if (result) return <ResultView result={result} title={set?.title ?? "Simulado"} seconds={seconds} />;

  const q = questions[index]!;
  const answered = Object.keys(answers).length;

  return (
    <div className="min-h-screen pb-28">
      <Header />
      <main className="container max-w-3xl py-8 space-y-5">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold">{set?.title}</h1>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Questão {index + 1} de {questions.length} • {answered} respondidas</p>
        </header>

        <article className="glass rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{subjectEmoji(q.subject)}</span>
            {q.topic && <span>{q.topic}</span>}
            <DifficultyBadge value={q.difficulty} />
            {q.institution && <span>{q.institution}{q.exam_year ? ` ${q.exam_year}` : ""}</span>}
          </div>
          <p className="whitespace-pre-line">{q.statement}</p>
          <ul className="space-y-2">
            {q.options.map((o) => {
              const selected = answers[q.id] === o.id;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                    className={cn(
                      "w-full text-left rounded-xl border p-3 flex gap-3 items-start transition",
                      selected ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/40",
                    )}
                  >
                    <span className="font-bold text-sm shrink-0">{o.label}</span>
                    <span className="text-sm">{o.content}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </article>

        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          {index < questions.length - 1 ? (
            <Button size="sm" onClick={() => setIndex((i) => i + 1)}>Próxima <ArrowRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <Button size="sm" className="btn-glow" onClick={finish} disabled={sending}>
              {sending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Finalizar e corrigir
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function ResultView({ result, title, seconds }: { result: QuizResult; title: string; seconds: number }) {
  return (
    <div className="min-h-screen pb-24">
      <Header />
      <main className="container max-w-3xl py-8 space-y-6">
        <section className="glass rounded-2xl p-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-5xl font-bold text-primary">{result.score}%</p>
          <p className="text-sm">
            {result.correct} de {result.total} corretas • {Math.floor(seconds / 60)} min
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="glass rounded-2xl p-5">
            <h2 className="font-bold text-sm mb-2">💪 Pontos fortes</h2>
            {result.strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">Continue praticando para identificar seus pontos fortes.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {result.strengths.map((s) => (
                  <li key={s.topic} className="flex justify-between"><span>{s.topic}</span><span className="text-success font-semibold">{s.percent}%</span></li>
                ))}
              </ul>
            )}
          </div>
          <div className="glass rounded-2xl p-5">
            <h2 className="font-bold text-sm mb-2">📉 Pontos a melhorar</h2>
            {result.weaknesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum ponto crítico neste simulado. Muito bem!</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {result.weaknesses.map((s) => (
                  <li key={s.topic} className="flex justify-between"><span>{s.topic}</span><span className="text-destructive font-semibold">{s.percent}%</span></li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-bold">Gabarito comentado</h2>
          {result.details.map((d, i) => (
            <article key={d.questionId} className="glass rounded-2xl p-5 space-y-3">
              <div className="flex items-start gap-2">
                {d.isCorrect ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> : <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                <p className="text-sm font-medium">{i + 1}. {d.statement}</p>
              </div>
              {d.explanation && <p className="text-sm text-muted-foreground whitespace-pre-line">{d.explanation}</p>}
              {!d.isCorrect && <StudyAssist questionId={d.questionId} actions={["explicar_erro", "mais_simples", "questao_parecida"]} />}
            </article>
          ))}
        </section>

        <div className="flex gap-2">
          <Link to="/questoes"><Button variant="outline">Outras listas</Button></Link>
          <Link to="/estudar"><Button className="btn-glow">O que estudar agora</Button></Link>
        </div>
      </main>
    </div>
  );
}
