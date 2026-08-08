import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX = (s: string | undefined | null, n: number) => (s ?? "").trim().slice(0, n);

/** Solicitação de verificação de vínculo docente (o usuário só cria a própria). */
export const requestTeacherVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      institution: string;
      teachingArea: string;
      teachingRole?: string;
      institutionalEmail?: string;
      documentPath?: string;
    }) => {
      if (!input?.institution?.trim() || !input?.teachingArea?.trim()) {
        throw new Response("Informe instituição e área", { status: 400 });
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pending } = await supabaseAdmin
      .from("teacher_verifications")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "pendente")
      .maybeSingle();
    if (pending) throw new Response("Você já possui uma solicitação em análise", { status: 409 });

    const email = MAX(data.institutionalEmail, 160).toLowerCase();
    const docPath = MAX(data.documentPath, 300);
    if (docPath && !docPath.startsWith(`${context.userId}/`)) {
      throw new Response("Documento inválido", { status: 400 });
    }
    if (!email && !docPath) throw new Response("Envie um e-mail institucional ou um documento", { status: 400 });

    const institutionalDomain = /\.(edu\.br|ifes\.edu\.br|if[a-z]{2}\.edu\.br|gov\.br)$/i.test(email);
    const method = docPath ? "documento" : institutionalDomain ? "email_institucional" : "analise_admin";

    const { error } = await supabaseAdmin.from("teacher_verifications").insert({
      user_id: context.userId,
      institution: MAX(data.institution, 120),
      teaching_area: MAX(data.teachingArea, 80),
      teaching_role: MAX(data.teachingRole, 80) || null,
      institutional_email: email || null,
      document_path: docPath || null,
      verification_method: method,
      status: "pendente",
    });
    if (error) throw new Response(error.message, { status: 500 });

    await supabaseAdmin
      .from("profiles")
      .update({
        user_type: "professor",
        is_teacher: true,
        institute: MAX(data.institution, 50),
        teaching_area: MAX(data.teachingArea, 80),
        teaching_role: MAX(data.teachingRole, 80) || null,
        verification_status: "pendente",
      })
      .eq("id", context.userId);

    return { ok: true };
  });

/** Histórico de solicitações do próprio usuário. */
export const myVerifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("teacher_verifications")
      .select("id,institution,teaching_area,teaching_role,institutional_email,verification_method,status,rejection_reason,created_at,reviewed_at,document_path")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({ ...r, document_path: r.document_path ? true : false }));
  });

async function ensureAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

/** Admin: lista solicitações. */
export const listVerifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: "pendente" | "todas" }) => input ?? {})
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("teacher_verifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "todas") q = q.eq("status", "pendente");
    const { data: rows, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });

    const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id,username,full_name,avatar_url").in("id", ids)
      : { data: [] as any[] };
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return (rows ?? []).map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
  });

/** Admin: URL assinada e temporária para o documento comprobatório. */
export const getVerificationDocUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { verificationId: string }) => {
    if (!input?.verificationId) throw new Response("Invalid input", { status: 400 });
    return input;
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("teacher_verifications")
      .select("document_path")
      .eq("id", data.verificationId)
      .maybeSingle();
    if (!row?.document_path) throw new Response("Sem documento", { status: 404 });
    const { data: signed, error } = await supabaseAdmin.storage
      .from("verification-docs")
      .createSignedUrl(row.document_path, 300);
    if (error || !signed) throw new Response("Falha ao gerar link", { status: 500 });
    return { url: signed.signedUrl };
  });

/** Admin: aprova ou rejeita uma solicitação. */
export const reviewVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { verificationId: string; approve: boolean; reason?: string }) => {
    if (!input?.verificationId || typeof input.approve !== "boolean") {
      throw new Response("Invalid input", { status: 400 });
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("teacher_verifications")
      .select("id,user_id,status,institution,teaching_area,teaching_role,verification_method")
      .eq("id", data.verificationId)
      .maybeSingle();
    if (!row) throw new Response("Solicitação não encontrada", { status: 404 });
    if (row.status !== "pendente") throw new Response("Solicitação já revisada", { status: 409 });

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("teacher_verifications")
      .update({
        status: data.approve ? "verificado" : "rejeitado",
        rejection_reason: data.approve ? null : MAX(data.reason, 400) || "Não foi possível comprovar o vínculo",
        reviewed_by: context.userId,
        reviewed_at: now,
      })
      .eq("id", row.id);
    if (error) throw new Response(error.message, { status: 500 });

    await supabaseAdmin
      .from("profiles")
      .update(
        data.approve
          ? {
              verification_status: "verificado",
              verified_at: now,
              verification_method: row.verification_method,
              user_type: "professor",
              is_teacher: true,
              institute: MAX(row.institution, 50),
              teaching_area: row.teaching_area,
              teaching_role: row.teaching_role,
            }
          : { verification_status: "rejeitado", verified_at: null, verification_method: null },
      )
      .eq("id", row.user_id);

    await supabaseAdmin.from("notifications").insert({
      user_id: row.user_id,
      type: "system",
      title: data.approve ? "Verificação de professor aprovada" : "Verificação de professor não aprovada",
      body: data.approve
        ? "Seu vínculo foi comprovado. O selo de professor verificado já aparece no seu perfil."
        : MAX(data.reason, 200) || "Não foi possível comprovar o vínculo informado.",
      link: "/dashboard",
    });

    return { ok: true };
  });

/** Admin: percentual da taxa da plataforma. */
export const getPlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("platform_settings").select("*").eq("id", true).maybeSingle();
    return data;
  });

export const updatePlatformFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { feePercent: number }) => {
    const n = Number(input?.feePercent);
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new Response("Percentual inválido", { status: 400 });
    return { feePercent: n };
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("platform_settings")
      .update({ platform_fee_percent: data.feePercent, updated_by: context.userId, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });
