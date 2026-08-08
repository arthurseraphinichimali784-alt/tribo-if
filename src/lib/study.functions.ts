import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f-]{36}$/i;

export interface TrackDetail {
  track: { id: string; slug: string; title: string; description: string | null; institution: string | null; level: string | null };
  subjects: Array<{
    subject: string;
    topics: Array<{ topic: string; status: string; percent: number; materials: number }>;
  }>;
}

/** Trilhas de preparação publicadas (ex.: IFES — Técnico em Informática). */
export const listTracks = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("exam_tracks")
    .select("id,slug,title,description,institution,level")
    .eq("published", true)
    .order("position");
  return data ?? [];
});

/** Trilha + assuntos + progresso do usuário (quando autenticado). */
export const getTrack = createServerFn({ method: "POST" })
  .inputValidator((input: { slug: string; userId?: string }) => {
    if (!input?.slug) throw new Response("Invalid input", { status: 400 });
    return { slug: input.slug };
  })
  .handler(async ({ data }): Promise<TrackDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: track } = await supabaseAdmin
      .from("exam_tracks")
      .select("id,slug,title,description,institution,level,published")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!track || !track.published) return null;

    const { data: topics } = await supabaseAdmin
      .from("track_topics")
      .select("subject,topic,position")
      .eq("track_id", track.id)
      .order("position");

    const grouped = new Map<string, TrackDetail["subjects"][number]["topics"]>();
    for (const t of topics ?? []) {
      const list = grouped.get(t.subject) ?? [];
      list.push({ topic: t.topic, status: "nao_iniciado", percent: 0, materials: 0 });
      grouped.set(t.subject, list);
    }

    return {
      track: track as TrackDetail["track"],
      subjects: [...grouped.entries()].map(([subject, tps]) => ({ subject, topics: tps })),
    };
  });

/** Progresso por assunto do usuário autenticado. */
export const getMyTopicProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("topic_progress")
      .select("subject,topic,status,percent,updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    return data ?? [];
  });

/** Marca o status de um assunto. Sempre escopo do próprio usuário. */
export const setTopicProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subject: string; topic: string; status: string }) => {
    if (!input?.subject || !input?.topic) throw new Response("Invalid input", { status: 400 });
    if (!["nao_iniciado", "em_andamento", "concluido"].includes(input.status)) {
      throw new Response("Status inválido", { status: 400 });
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const percent = data.status === "concluido" ? 100 : data.status === "em_andamento" ? 50 : 0;
    const { error } = await supabaseAdmin.from("topic_progress").upsert(
      {
        user_id: context.userId,
        subject: data.subject as never,
        topic: data.topic.slice(0, 80),
        status: data.status,
        percent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,subject,topic" },
    );
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true, percent };
  });

export interface StudyPlanItem {
  topic: string;
  subject: string;
  reason: string;
  percent: number | null;
  materials: Array<{ id: string; title: string; type: string; price: number; subject: string; cover_url: string | null }>;
  sets: Array<{ id: string; title: string; kind: string }>;
}

/**
 * "O que estudar agora?" — combina desempenho em questões, progresso por
 * assunto e materiais disponíveis. Tudo calculado no servidor.
 */
export const getStudyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: StudyPlanItem[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: answers }, { data: progress }] = await Promise.all([
      supabaseAdmin.from("quiz_answers").select("subject,topic,is_correct").eq("user_id", context.userId).limit(2000),
      supabaseAdmin.from("topic_progress").select("subject,topic,status,percent").eq("user_id", context.userId),
    ]);

    const stats = new Map<string, { subject: string; topic: string; total: number; correct: number }>();
    for (const a of answers ?? []) {
      if (!a.topic || !a.subject) continue;
      const key = `${a.subject}::${a.topic}`;
      const cur = stats.get(key) ?? { subject: a.subject, topic: a.topic, total: 0, correct: 0 };
      cur.total += 1;
      if (a.is_correct) cur.correct += 1;
      stats.set(key, cur);
    }

    const weak = [...stats.values()]
      .filter((s) => s.total >= 2 && s.correct / s.total < 0.7)
      .sort((a, b) => a.correct / a.total - b.correct / b.total)
      .slice(0, 3)
      .map((s) => ({
        subject: s.subject,
        topic: s.topic,
        percent: Math.round((s.correct / s.total) * 100),
        reason: `Você está acertando apenas ${Math.round((s.correct / s.total) * 100)}% das questões deste assunto.`,
      }));

    const inProgress = (progress ?? [])
      .filter((p) => p.status === "em_andamento")
      .slice(0, 3)
      .map((p) => ({
        subject: p.subject as string,
        topic: p.topic,
        percent: p.percent,
        reason: "Você começou este assunto e ainda não concluiu.",
      }));

    const seen = new Set<string>();
    const targets = [...weak, ...inProgress].filter((t) => {
      const k = `${t.subject}::${t.topic}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    if (targets.length === 0) return { items: [] };

    const items: StudyPlanItem[] = [];
    for (const t of targets) {
      const [{ data: mats }, { data: sets }] = await Promise.all([
        supabaseAdmin
          .from("materials")
          .select("id,title,type,price,subject,cover_url")
          .eq("published", true)
          .eq("subject", t.subject as never)
          .contains("topics", [t.topic])
          .order("rating", { ascending: false })
          .limit(4),
        supabaseAdmin
          .from("question_sets")
          .select("id,title,kind")
          .eq("published", true)
          .contains("topics", [t.topic])
          .limit(2),
      ]);
      items.push({
        topic: t.topic,
        subject: t.subject,
        reason: t.reason,
        percent: t.percent ?? null,
        materials: mats ?? [],
        sets: sets ?? [],
      });
    }
    return { items };
  });

/** Materiais associados a um assunto (usado nas trilhas). */
export const getTopicMaterials = createServerFn({ method: "POST" })
  .inputValidator((input: { subject: string; topic: string }) => {
    if (!input?.subject || !input?.topic) throw new Response("Invalid input", { status: 400 });
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: mats } = await supabaseAdmin
      .from("materials")
      .select("id,title,type,price,subject,cover_url,rating,rating_count")
      .eq("published", true)
      .eq("subject", data.subject as never)
      .contains("topics", [data.topic])
      .order("rating", { ascending: false })
      .limit(12);
    return mats ?? [];
  });

/** Continue estudando: materiais com progresso aberto. */
export const getContinueStudying = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("material_progress")
      .select("material_id,progress_percent,last_page,last_accessed_at,materials(id,title,subject,type,cover_url,topics)")
      .eq("user_id", context.userId)
      .lt("progress_percent", 100)
      .order("last_accessed_at", { ascending: false })
      .limit(6);
    return (data ?? []).filter((r) => r.materials);
  });

export const isUuid = (v: string) => UUID.test(v);
