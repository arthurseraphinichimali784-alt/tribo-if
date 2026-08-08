import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f-]{36}$/i;

/** Avaliações públicas de um material ou kit. */
export const listReviews = createServerFn({ method: "GET" })
  .inputValidator((input: { materialId?: string; kitId?: string }) => {
    if (!input?.materialId && !input?.kitId) throw new Response("Invalid input", { status: 400 });
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("reviews")
      .select("id,user_id,rating,quality,clarity,value_rating,comment,verified_purchase,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    q = data.materialId ? q.eq("material_id", data.materialId) : q.eq("kit_id", data.kitId!);
    const { data: reviews } = await q;

    const ids = [...new Set((reviews ?? []).map((r) => r.user_id))];
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id,username,avatar_url").in("id", ids)
      : { data: [] };
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    return (reviews ?? []).map(({ user_id, ...r }) => ({ ...r, profile: map.get(user_id) ?? null }));
  });

/**
 * Cria/atualiza a avaliação do usuário.
 * Só quem realmente adquiriu (compra paga, material gratuito adquirido ou autor de nada)
 * pode avaliar — o servidor decide, nunca o frontend.
 */
export const upsertReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    materialId?: string;
    kitId?: string;
    rating: number;
    quality?: number;
    clarity?: number;
    valueRating?: number;
    comment?: string;
  }) => {
    const target = input?.materialId ?? input?.kitId;
    if (!target || !UUID.test(target)) throw new Response("Invalid input", { status: 400 });
    if (input.materialId && input.kitId) throw new Response("Invalid input", { status: 400 });
    if (!Number.isFinite(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new Response("Nota inválida", { status: 400 });
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const clamp = (n?: number) => (Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n as number))) : null);

    let allowed = false;
    if (data.materialId) {
      const { data: material } = await supabaseAdmin
        .from("materials")
        .select("author_id")
        .eq("id", data.materialId)
        .maybeSingle();
      if (!material) throw new Response("Material não encontrado", { status: 404 });
      if (material.author_id === context.userId) {
        throw new Response("Você não pode avaliar o próprio material", { status: 403 });
      }
      const { data: access } = await supabaseAdmin.rpc("has_material_access", {
        _user_id: context.userId,
        _material_id: data.materialId,
      });
      allowed = !!access;
    } else {
      const { data: kit } = await supabaseAdmin.from("kits").select("author_id").eq("id", data.kitId!).maybeSingle();
      if (!kit) throw new Response("Kit não encontrado", { status: 404 });
      if (kit.author_id === context.userId) throw new Response("Você não pode avaliar o próprio kit", { status: 403 });
      const { data: purchase } = await supabaseAdmin
        .from("purchases")
        .select("id")
        .eq("buyer_id", context.userId)
        .eq("kit_id", data.kitId!)
        .eq("status", "pago")
        .maybeSingle();
      allowed = !!purchase;
    }
    if (!allowed) throw new Response("Só é possível avaliar produtos que você adquiriu", { status: 403 });

    const payload = {
      user_id: context.userId,
      material_id: data.materialId ?? null,
      kit_id: data.kitId ?? null,
      rating: Math.min(5, Math.max(1, Math.round(data.rating))),
      quality: clamp(data.quality),
      clarity: clamp(data.clarity),
      value_rating: clamp(data.valueRating),
      comment: data.comment?.slice(0, 1000) ?? null,
      verified_purchase: true,
    };

    const { data: existing } = await supabaseAdmin
      .from("reviews")
      .select("id")
      .eq("user_id", context.userId)
      .eq(data.materialId ? "material_id" : "kit_id", (data.materialId ?? data.kitId)!)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin.from("reviews").update(payload).eq("id", existing.id);
      if (error) throw new Response(error.message, { status: 500 });
      return { ok: true, updated: true };
    }
    const { error } = await supabaseAdmin.from("reviews").insert(payload);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true, updated: false };
  });

/** Avaliação do próprio usuário (para pré-preencher o formulário). */
export const myReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { materialId?: string; kitId?: string }) => input ?? {})
  .handler(async ({ data, context }) => {
    if (!data.materialId && !data.kitId) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: review } = await supabaseAdmin
      .from("reviews")
      .select("id,rating,quality,clarity,value_rating,comment")
      .eq("user_id", context.userId)
      .eq(data.materialId ? "material_id" : "kit_id", (data.materialId ?? data.kitId)!)
      .maybeSingle();
    return review;
  });
