import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f-]{36}$/i;

export interface QuizQuestion {
  id: string;
  statement: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  institution: string | null;
  exam_year: number | null;
  options: Array<{ id: string; label: string; content: string }>;
}

/** Lista pública de listas/simulados publicados. */
export const listQuestionSets = createServerFn({ method: "GET" })
  .inputValidator((input: { kind?: string; subject?: string; limit?: number }) => input ?? {})
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("question_sets")
      .select("id,title,description,kind,subject,topics,difficulty,institution,time_limit_minutes,created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 30, 60));
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.subject) q = q.eq("subject", data.subject as never);
    const { data: sets } = await q;

    const ids = (sets ?? []).map((s) => s.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: rows } = await supabaseAdmin.from("question_set_items").select("set_id").in("set_id", ids);
      (rows ?? []).forEach((r) => counts.set(r.set_id, (counts.get(r.set_id) ?? 0) + 1));
    }
    return (sets ?? []).map((s) => ({ ...s, question_count: counts.get(s.id) ?? 0 }));
  });

/**
 * Questões de uma lista/simulado — SEM gabarito e SEM explicação.
 * O gabarito só é revelado depois do envio das respostas.
 */
export const getQuiz = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { setId: string }) => {
    if (!UUID.test(input?.setId ?? "")) throw new Response("Invalid input", { status: 400 });
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: set } = await supabaseAdmin
      .from("question_sets")
      .select("id,title,description,kind,subject,difficulty,time_limit_minutes,published")
      .eq("id", data.setId)
      .maybeSingle();
    if (!set || !set.published) throw new Response("Não encontrado", { status: 404 });

    const { data: items } = await supabaseAdmin
      .from("question_set_items")
      .select("position,questions(id,statement,subject,topic,difficulty,institution,exam_year)")
      .eq("set_id", data.setId)
      .order("position");

    const questions = (items ?? [])
      .map((r: { questions: unknown }) => r.questions as Omit<QuizQuestion, "options"> | null)
      .filter(Boolean) as Array<Omit<QuizQuestion, "options">>;

    const { data: options } = await supabaseAdmin
      .from("question_options")
      .select("id,question_id,label,content,position")
      .in("question_id", questions.map((q) => q.id))
      .order("position");

    const byQ = new Map<string, QuizQuestion["options"]>();
    (options ?? []).forEach((o) => {
      const list = byQ.get(o.question_id) ?? [];
      list.push({ id: o.id, label: o.label, content: o.content });
      byQ.set(o.question_id, list);
    });

    return {
      set,
      questions: questions.map((q) => ({ ...q, options: byQ.get(q.id) ?? [] })) as QuizQuestion[],
    };
  });

export interface QuizResult {
  attemptId: string;
  total: number;
  correct: number;
  score: number;
  bySubject: Array<{ subject: string; total: number; correct: number; percent: number }>;
  byTopic: Array<{ subject: string; topic: string; total: number; correct: number; percent: number }>;
  strengths: Array<{ topic: string; percent: number }>;
  weaknesses: Array<{ topic: string; percent: number }>;
  details: Array<{
    questionId: string;
    statement: string;
    topic: string | null;
    chosenOptionId: string | null;
    correctOptionId: string | null;
    isCorrect: boolean;
    explanation: string | null;
  }>;
}

/** Correção 100% no servidor. O frontend nunca sabe a resposta antes de enviar. */
export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { setId: string; answers: Array<{ questionId: string; optionId: string | null }> }) => {
    if (!UUID.test(input?.setId ?? "")) throw new Response("Invalid input", { status: 400 });
    if (!Array.isArray(input.answers) || input.answers.length === 0 || input.answers.length > 200) {
      throw new Response("Invalid input", { status: 400 });
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<QuizResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const qIds = [...new Set(data.answers.map((a) => a.questionId).filter((id) => UUID.test(id)))];
    const [{ data: questions }, { data: options }] = await Promise.all([
      supabaseAdmin.from("questions").select("id,statement,subject,topic,explanation").in("id", qIds),
      supabaseAdmin.from("question_options").select("id,question_id,is_correct").in("question_id", qIds),
    ]);

    const correctByQ = new Map<string, string>();
    (options ?? []).forEach((o) => { if (o.is_correct) correctByQ.set(o.question_id, o.id); });
    const qMap = new Map((questions ?? []).map((q) => [q.id, q]));

    const { data: attempt, error: attErr } = await supabaseAdmin
      .from("quiz_attempts")
      .insert({ user_id: context.userId, set_id: data.setId, total: 0, correct: 0, score: 0 })
      .select("id")
      .single();
    if (attErr || !attempt) throw new Response("Falha ao registrar tentativa", { status: 500 });

    const details: QuizResult["details"] = [];
    const rows = data.answers
      .filter((a) => qMap.has(a.questionId))
      .map((a) => {
        const q = qMap.get(a.questionId)!;
        const correctId = correctByQ.get(a.questionId) ?? null;
        const isCorrect = !!a.optionId && a.optionId === correctId;
        details.push({
          questionId: q.id,
          statement: q.statement,
          topic: q.topic,
          chosenOptionId: a.optionId ?? null,
          correctOptionId: correctId,
          isCorrect,
          explanation: q.explanation,
        });
        return {
          attempt_id: attempt.id,
          user_id: context.userId,
          question_id: q.id,
          option_id: a.optionId ?? null,
          is_correct: isCorrect,
          subject: q.subject,
          topic: q.topic,
        };
      });

    if (rows.length) await supabaseAdmin.from("quiz_answers").insert(rows);

    const total = rows.length;
    const correct = rows.filter((r) => r.is_correct).length;
    const score = total ? Number(((correct / total) * 100).toFixed(1)) : 0;

    await supabaseAdmin
      .from("quiz_attempts")
      .update({ total, correct, score, finished_at: new Date().toISOString() })
      .eq("id", attempt.id);

    const agg = aggregate(rows);
    return { attemptId: attempt.id, total, correct, score, ...agg, details };
  });

/** Desempenho consolidado do aluno (usado nas recomendações e na Home). */
export const getPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: answers } = await supabaseAdmin
      .from("quiz_answers")
      .select("subject,topic,is_correct")
      .eq("user_id", context.userId)
      .limit(2000);
    const rows = (answers ?? []).map((a) => ({
      subject: a.subject ?? "",
      topic: a.topic,
      is_correct: a.is_correct,
    }));
    return { answered: rows.length, ...aggregate(rows) };
  });

function aggregate(rows: Array<{ subject: string | null; topic: string | null; is_correct: boolean }>) {
  const subj = new Map<string, { total: number; correct: number }>();
  const top = new Map<string, { subject: string; topic: string; total: number; correct: number }>();
  for (const r of rows) {
    const s = r.subject ?? "outro";
    const cur = subj.get(s) ?? { total: 0, correct: 0 };
    cur.total += 1;
    if (r.is_correct) cur.correct += 1;
    subj.set(s, cur);
    if (r.topic) {
      const key = `${s}::${r.topic}`;
      const t = top.get(key) ?? { subject: s, topic: r.topic, total: 0, correct: 0 };
      t.total += 1;
      if (r.is_correct) t.correct += 1;
      top.set(key, t);
    }
  }
  const pct = (c: number, t: number) => (t ? Math.round((c / t) * 100) : 0);
  const bySubject = [...subj.entries()].map(([subject, v]) => ({ subject, ...v, percent: pct(v.correct, v.total) }));
  const byTopic = [...top.values()].map((v) => ({ ...v, percent: pct(v.correct, v.total) }));
  const ranked = [...byTopic].filter((t) => t.total >= 2).sort((a, b) => b.percent - a.percent);
  return {
    bySubject,
    byTopic,
    strengths: ranked.filter((t) => t.percent >= 70).slice(0, 3).map((t) => ({ topic: t.topic, percent: t.percent })),
    weaknesses: ranked.filter((t) => t.percent < 70).reverse().slice(0, 3).map((t) => ({ topic: t.topic, percent: t.percent })),
  };
}
