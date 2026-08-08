import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f-]{36}$/i;

export interface KitDetail {
  kit: {
    id: string;
    title: string;
    description: string | null;
    cover_url: string | null;
    price: number;
    subject: string | null;
    level: string | null;
    difficulty: string;
    topics: string[];
    goals: string[];
    rating: number;
    rating_count: number;
    author_id: string;
    published: boolean;
    created_at: string;
  };
  author: { username: string; full_name: string | null; avatar_url: string | null; verification_status: string | null; teaching_area: string | null; institute: string | null } | null;
  items: Array<{
    id: string;
    title: string;
    subject: string;
    type: string;
    price: number;
    cover_url: string | null;
  }>;
  individualTotal: number;
  savings: number;
}

/** Detalhe público de um Kit (somente kits publicados). */
export const getKit = createServerFn({ method: "GET" })
  .inputValidator((input: { kitId: string }) => {
    if (!UUID.test(input?.kitId ?? "")) throw new Response("Invalid input", { status: 400 });
    return input;
  })
  .handler(async ({ data }): Promise<KitDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: kit } = await supabaseAdmin
      .from("kits")
      .select("id,title,description,cover_url,price,subject,level,difficulty,topics,goals,rating,rating_count,author_id,published,created_at")
      .eq("id", data.kitId)
      .maybeSingle();
    if (!kit || !kit.published) return null;

    const [{ data: author }, { data: items }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("username,full_name,avatar_url,verification_status,teaching_area,institute")
        .eq("id", kit.author_id)
        .maybeSingle(),
      supabaseAdmin
        .from("kit_items")
        .select("position,materials(id,title,subject,type,price,cover_url)")
        .eq("kit_id", data.kitId)
        .order("position"),
    ]);

    const mats = (items ?? [])
      .map((r: { materials: unknown }) => r.materials as KitDetail["items"][number] | null)
      .filter(Boolean) as KitDetail["items"];
    const individualTotal = mats.reduce((s, m) => s + Number(m.price ?? 0), 0);

    return {
      kit: kit as KitDetail["kit"],
      author: (author as KitDetail["author"]) ?? null,
      items: mats,
      individualTotal: Number(individualTotal.toFixed(2)),
      savings: Number(Math.max(0, individualTotal - Number(kit.price ?? 0)).toFixed(2)),
    };
  });

/** Lista pública de kits publicados. */
export const listKits = createServerFn({ method: "GET" })
  .inputValidator((input: { limit?: number; subject?: string }) => input ?? {})
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("kits")
      .select("id,title,description,cover_url,price,subject,level,difficulty,topics,rating,rating_count,author_id,created_at,profiles:author_id(username,avatar_url,verification_status,teaching_area,institute)")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 24, 48));
    if (data.subject) q = q.eq("subject", data.subject as never);
    const { data: kits } = await q;

    const ids = (kits ?? []).map((k) => k.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: rows } = await supabaseAdmin.from("kit_items").select("kit_id").in("kit_id", ids);
      (rows ?? []).forEach((r) => counts.set(r.kit_id, (counts.get(r.kit_id) ?? 0) + 1));
    }
    return (kits ?? []).map((k) => ({ ...k, item_count: counts.get(k.id) ?? 0 }));
  });

/**
 * Compra de Kit. O preço vem sempre do banco — nunca do frontend.
 * Kit gratuito é liberado na hora; kit pago fica pendente até o provedor confirmar.
 */
export const acquireKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kitId: string }) => {
    if (!UUID.test(input?.kitId ?? "")) throw new Response("Invalid input", { status: 400 });
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: kit } = await supabaseAdmin
      .from("kits")
      .select("id,price,author_id,published")
      .eq("id", data.kitId)
      .maybeSingle();
    if (!kit || !kit.published) throw new Response("Kit indisponível", { status: 404 });
    if (kit.author_id === context.userId) return { status: "autor" as const, license: null };

    const { data: existing } = await supabaseAdmin
      .from("purchases")
      .select("id,license_code,status")
      .eq("buyer_id", context.userId)
      .eq("kit_id", data.kitId)
      .in("status", ["pendente", "pago"])
      .maybeSingle();
    if (existing) return { status: existing.status as "pendente" | "pago", license: existing.license_code };

    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("platform_fee_percent")
      .eq("id", true)
      .maybeSingle();
    const feePercent = Number(settings?.platform_fee_percent ?? 5);
    const price = Number(kit.price ?? 0);
    const isFree = price <= 0;

    const { data: code, error: codeErr } = await supabaseAdmin.rpc("gen_license_code");
    if (codeErr || !code) throw new Response("Falha ao gerar licença", { status: 500 });

    const { data: inserted, error } = await supabaseAdmin
      .from("purchases")
      .insert({
        license_code: code as unknown as string,
        buyer_id: context.userId,
        kit_id: kit.id,
        material_id: null,
        author_id: kit.author_id,
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

/** Kits adquiridos pelo usuário (para a Biblioteca). */
export const myKits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("purchases")
      .select("license_code,status,created_at,kits(id,title,cover_url,price,subject,level,difficulty,topics)")
      .eq("buyer_id", context.userId)
      .not("kit_id", "is", null)
      .order("created_at", { ascending: false });
    return (data ?? []).filter((p) => p.kits);
  });
