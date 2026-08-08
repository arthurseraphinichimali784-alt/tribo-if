import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { studyAssist, type StudyAction } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const ACTIONS: Array<{ action: StudyAction; label: string }> = [
  { action: "explicar_erro", label: "🤖 Explique por que errei" },
  { action: "mais_simples", label: "💡 Explique de forma mais simples" },
  { action: "questao_parecida", label: "🧠 Gere uma questão parecida" },
  { action: "estudar_assunto", label: "📚 Quero estudar este assunto" },
];

/** Ações educacionais da IA com o contexto do aluno montado no servidor. */
export function StudyAssist({
  questionId,
  subject,
  topic,
  actions = ACTIONS.map((a) => a.action),
}: {
  questionId?: string;
  subject?: string;
  topic?: string;
  actions?: StudyAction[];
}) {
  const ask = useServerFn(studyAssist);
  const [loading, setLoading] = useState<StudyAction | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  async function run(action: StudyAction) {
    setLoading(action);
    setAnswer(null);
    try {
      const res = await ask({ data: { action, questionId, subject, topic } });
      setAnswer(res.content);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "A IA não respondeu agora. Tente de novo.");
    }
    setLoading(null);
  }

  const list = ACTIONS.filter((a) => actions.includes(a.action));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {list.map((a) => (
          <Button key={a.action} size="sm" variant="outline" disabled={loading !== null} onClick={() => run(a.action)}>
            {loading === a.action ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            {a.label}
          </Button>
        ))}
      </div>
      {answer && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm whitespace-pre-line">
          <p className="flex items-center gap-1 text-xs font-semibold text-primary mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Tutor StudyHUB
          </p>
          {answer}
        </div>
      )}
    </div>
  );
}
