import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { listQuestionSets } from "@/lib/questions.functions";
import { DifficultyBadge } from "@/components/ContentTags";
import { subjectEmoji, subjectLabel } from "@/lib/constants";
import { Loader2, ListChecks } from "lucide-react";

export const Route = createFileRoute("/questoes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Questões e simulados | StudyHub IF" },
      { name: "description", content: "Listas de exercícios e simulados no estilo das provas dos Institutos Federais, com correção automática e gabarito comentado." },
      { property: "og:title", content: "Questões e simulados | StudyHub IF" },
      { property: "og:description", content: "Pratique com listas e simulados e descubra seus pontos fortes e fracos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuestionsPage,
});

type SetRow = {
  id: string; title: string; description: string | null; kind: string;
  subject: string | null; difficulty: string; institution: string | null;
  time_limit_minutes: number | null; question_count: number;
};

function QuestionsPage() {
  const fetchSets = useServerFn(listQuestionSets);
  const [kind, setKind] = useState<string | undefined>(undefined);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const res = await fetchSets({ data: kind ? { kind } : {} });
      if (!cancelled) { setSets(res as unknown as SetRow[]); setLoading(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <main className="container max-w-5xl py-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ListChecks className="h-7 w-7 text-primary" /> Questões e simulados
          </h1>
          <p className="text-muted-foreground mt-1">
            Pratique com listas e simulados, receba correção automática e veja onde precisa melhorar.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={!kind ? "default" : "outline"} onClick={() => setKind(undefined)}>Todos</Button>
          <Button size="sm" variant={kind === "lista" ? "default" : "outline"} onClick={() => setKind("lista")}>📋 Listas</Button>
          <Button size="sm" variant={kind === "simulado" ? "default" : "outline"} onClick={() => setKind("simulado")}>📝 Simulados</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : sets.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="font-semibold">Nenhuma lista publicada ainda</p>
            <p className="text-sm text-muted-foreground">Em breve novas questões no estilo IF.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {sets.map((s) => (
              <li key={s.id}>
                <Link to="/simulado/$id" params={{ id: s.id }} className="block glass rounded-2xl p-5 hover:border-primary/50 transition h-full">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                    <span>{s.kind === "simulado" ? "📝 Simulado" : "📋 Lista"}</span>
                    {s.subject && <span>{subjectEmoji(s.subject)} {subjectLabel(s.subject)}</span>}
                    <DifficultyBadge value={s.difficulty} />
                  </div>
                  <p className="font-semibold">{s.title}</p>
                  {s.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{s.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    {s.question_count} questões{s.time_limit_minutes ? ` • ${s.time_limit_minutes} min` : ""}
                    {s.institution ? ` • ${s.institution}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
