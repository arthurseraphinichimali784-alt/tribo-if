import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Estado de acesso do usuário a um material.
 * Nunca devolve o caminho do arquivo no storage.
 */
export const getMaterialAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { materialId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input?.materialId ?? "")) throw new Response("Invalid input", { status: 400 });
    return input;
  })
  .handler(async ({ data, context }) => {
    const { resolveAccess } = await import("@/lib/access.server");
    const resolved = await resolveAccess(context.userId, data.materialId);
    if (!resolved) throw new Response("Not found", { status: 404 });
    return {
      hasAccess: resolved.hasAccess,
      isAuthor: resolved.material.author_id === context.userId,
      isFree: Number(resolved.material.price) <= 0,
      hasFile: !!resolved.material.file_path,
      previewPages: resolved.material.preview_pages,
      license: resolved.license?.code ?? null,
    };
  });

/**
 * Cria (ou reaproveita) uma licença.
 * - Material gratuito: concede a licença na hora (amount = 0, provedor "gratuito").
 * - Material pago: cria a compra como PENDENTE. Nenhuma compra é marcada como paga
 *   aqui — isso só acontece na confirmação real do provedor de pagamento.
 */
export const acquireMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { materialId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input?.materialId ?? "")) throw new Response("Invalid input", { status: 400 });
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: material } = await supabaseAdmin
      .from("materials")
      .select("id,price,author_id,published")
      .eq("id", data.materialId)
      .maybeSingle();
    if (!material || !material.published) throw new Response("Material indisponível", { status: 404 });
    if (material.author_id === context.userId) return { status: "autor" as const, license: null };

    const { data: existing } = await supabaseAdmin
      .from("purchases")
      .select("id,license_code,status")
      .eq("buyer_id", context.userId)
      .eq("material_id", data.materialId)
      .in("status", ["pendente", "pago"])
      .maybeSingle();
    if (existing) return { status: existing.status as "pendente" | "pago", license: existing.license_code };

    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("platform_fee_percent")
      .eq("id", true)
      .maybeSingle();
    const feePercent = Number(settings?.platform_fee_percent ?? 5);
    const price = Number(material.price ?? 0);
    const isFree = price <= 0;

    const { data: codeRow, error: codeErr } = await supabaseAdmin.rpc("gen_license_code");
    if (codeErr || !codeRow) throw new Response("Falha ao gerar licença", { status: 500 });

    const { data: inserted, error } = await supabaseAdmin
      .from("purchases")
      .insert({
        license_code: codeRow as unknown as string,
        buyer_id: context.userId,
        material_id: material.id,
        author_id: material.author_id,
        amount: price,
        platform_fee_percent: isFree ? 0 : feePercent,
        platform_fee: isFree ? 0 : Number(((price * feePercent) / 100).toFixed(2)),
        status: isFree ? "pago" : "pendente",
        payment_provider: isFree ? "gratuito" : null,
        paid_at: isFree ? new Date().toISOString() : null,
      })
      .select("license_code,status")
      .single();
    if (error) throw new Response(error.message, { status: 500 });

    return { status: inserted.status as "pendente" | "pago", license: inserted.license_code };
  });

/** Salva o progresso de leitura (o próprio usuário, com licença válida). */
export const saveProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { materialId: string; page?: number; percent?: number }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input?.materialId ?? "")) throw new Response("Invalid input", { status: 400 });
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: allowed } = await supabaseAdmin.rpc("has_material_access", {
      _user_id: context.userId,
      _material_id: data.materialId,
    });
    if (!allowed) throw new Response("Sem licença", { status: 403 });

    const percent = Math.min(100, Math.max(0, Math.round(Number(data.percent ?? 0))));
    const page = Math.max(0, Math.round(Number(data.page ?? 0)));

    const { error } = await supabaseAdmin.from("material_progress").upsert(
      {
        user_id: context.userId,
        material_id: data.materialId,
        progress_percent: percent,
        last_page: page,
        last_accessed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,material_id" },
    );
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

/** Telemetria mínima de sessão (sem bloqueio, apenas registro). */
export const touchSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionKey: string; deviceType?: string; browser?: string; os?: string }) => {
    if (!input?.sessionKey || input.sessionKey.length > 64) throw new Response("Invalid input", { status: 400 });
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_sessions").upsert(
      {
        user_id: context.userId,
        session_key: data.sessionKey,
        device_type: data.deviceType?.slice(0, 32) ?? null,
        browser: data.browser?.slice(0, 40) ?? null,
        os: data.os?.slice(0, 40) ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,session_key" },
    );
    return { ok: true };
  });
