import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-2.5-flash";
const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type StudyAction = "explicar_erro" | "mais_simples" | "questao_parecida" | "estudar_assunto" | "plano_estudos";

const PROMPTS: Record<StudyAction, string> = {
  explicar_erro: "Explique de forma didática por que a resposta escolhida está errada e qual é o raciocínio correto.",
  mais_simples: "Explique novamente de um jeito bem mais simples, como se fosse para um aluno do 9º ano, usando um exemplo do dia a dia.",
  questao_parecida: "Crie UMA questão de múltipla escolha parecida (5 alternativas A–E), indique a alternativa correta no final e explique brevemente.",
  estudar_assunto: "Monte um roteiro curto de estudo deste assunto: conceitos essenciais, passo a passo, erros comuns e o que praticar.",
  plano_estudos: "Monte um plano de estudos semanal e objetivo com base no desempenho informado.",
};

/**
 * Ações educacionais da IA. O contexto do aluno é montado no servidor —
 * o frontend não escolhe o system prompt nem envia dados de desempenho.
 */
export const studyAssist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { action: StudyAction; questionId?: string; subject?: string; topic?: string; extra?: string }) => {
    if (!input?.action || !(input.action in PROMPTS)) throw new Response("Ação inválida", { status: 400 });
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const parts: string[] = [];

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("level,user_type")
      .eq("id", context.userId)
      .maybeSingle();
    if (profile) parts.push(`Perfil do aluno: nível ${profile.level ?? 1}.`);

    if (data.questionId && /^[0-9a-f-]{36}$/i.test(data.questionId)) {
      const [{ data: q }, { data: opts }, { data: ans }] = await Promise.all([
        supabaseAdmin.from("questions").select("statement,subject,topic,explanation").eq("id", data.questionId).maybeSingle(),
        supabaseAdmin.from("question_options").select("label,content,is_correct").eq("question_id", data.questionId).order("position"),
        supabaseAdmin
          .from("quiz_answers")
          .select("option_id,is_correct")
          .eq("user_id", context.userId)
          .eq("question_id", data.questionId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      if (q) {
        parts.push(`Questão (${q.subject}${q.topic ? " / " + q.topic : ""}): ${q.statement}`);
        parts.push(
          "Alternativas:\n" +
            (opts ?? []).map((o) => `${o.label}) ${o.content}${o.is_correct ? "  [CORRETA]" : ""}`).join("\n"),
        );
        if (q.explanation) parts.push(`Explicação oficial: ${q.explanation}`);
        if (ans?.[0]) parts.push(`O aluno ${ans[0].is_correct ? "acertou" : "errou"} esta questão.`);
      }
    }

    if (data.subject || data.topic) {
      parts.push(`Assunto: ${[data.subject, data.topic].filter(Boolean).join(" / ")}.`);
    }

    if (data.action === "plano_estudos") {
      const { data: answers } = await supabaseAdmin
        .from("quiz_answers")
        .select("subject,topic,is_correct")
        .eq("user_id", context.userId)
        .limit(500);
      const stats = new Map<string, { t: number; c: number }>();
      for (const a of answers ?? []) {
        if (!a.topic) continue;
        const cur = stats.get(a.topic) ?? { t: 0, c: 0 };
        cur.t += 1;
        if (a.is_correct) cur.c += 1;
        stats.set(a.topic, cur);
      }
      if (stats.size) {
        parts.push(
          "Desempenho por assunto: " +
            [...stats.entries()].map(([k, v]) => `${k} ${Math.round((v.c / v.t) * 100)}%`).join(", "),
        );
      }
    }

    if (data.extra) parts.push(`Observação do aluno: ${data.extra.slice(0, 500)}`);

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Response("IA indisponível", { status: 503 });

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "Você é o tutor do StudyHUB IF, especialista em preparar estudantes brasileiros para Institutos Federais. " +
              "Responda sempre em português do Brasil, de forma didática, direta e encorajadora. Use markdown curto, " +
              "com no máximo 250 palavras. Nunca invente que o aluno acertou ou errou algo que não foi informado.",
          },
          { role: "user", content: `${PROMPTS[data.action]}\n\n${parts.join("\n\n")}` },
        ],
      }),
    });

    if (res.status === 429) throw new Response("Muitas solicitações à IA. Tente novamente em instantes.", { status: 429 });
    if (res.status === 402) throw new Response("Créditos de IA esgotados.", { status: 402 });
    if (!res.ok) throw new Response("Falha ao consultar a IA", { status: 502 });

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { content: json.choices?.[0]?.message?.content ?? "Não consegui gerar uma resposta agora." };
  });
