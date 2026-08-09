import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f-]{36}$/i;
const ALLOWED_ORIGIN = /^https?:\/\/(localhost:\d+|[a-z0-9-]+\.lovable\.app|studyhubif\.lovable\.app)$/i;

type CheckoutInput = { materialId?: string; kitId?: string; origin: string };

/**
 * Cria a compra (pendente) e devolve a URL de checkout do Mercado Pago.
 * O preço e a comissão vêm sempre do banco — nunca do frontend.
 * Itens gratuitos são liberados na hora, sem passar pelo provedor.
 */
export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CheckoutInput) => {
    const hasMaterial = !!input?.materialId;
    const hasKit = !!input?.kitId;
    if (hasMaterial === hasKit) throw new Response("Invalid input", { status: 400 });
    if (hasMaterial && !UUID.test(input.materialId!)) throw new Response("Invalid input", { status: 400 });
    if (hasKit && !UUID.test(input.kitId!)) throw new Response("Invalid input", { status: 400 });
    if (!ALLOWED_ORIGIN.test(input?.origin ?? "")) throw new Response("Invalid input", { status: 400 });
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isKit = !!data.kitId;

    const item = isKit
      ? await supabaseAdmin.from("kits").select("id,title,price,author_id,published").eq("id", data.kitId!).maybeSingle()
      : await supabaseAdmin
          .from("materials")
          .select("id,title,price,author_id,published")
          .eq("id", data.materialId!)
          .maybeSingle();

    const row = item.data as { id: string; title: string; price: number; author_id: string; published: boolean } | null;
    if (!row || !row.published) throw new Response("Item indisponível", { status: 404 });
    if (row.author_id === context.userId) return { status: "autor" as const, license: null, url: null };

    const filterColumn = isKit ? "kit_id" : "material_id";
    const { data: existing } = await supabaseAdmin
      .from("purchases")
      .select("id,license_code,status")
      .eq("buyer_id", context.userId)
      .eq(filterColumn, row.id)
      .in("status", ["pendente", "pago"])
      .maybeSingle();

    if (existing?.status === "pago") {
      return { status: "pago" as const, license: existing.license_code, url: null };
    }

    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("platform_fee_percent")
      .eq("id", true)
      .maybeSingle();
    const feePercent = Number(settings?.platform_fee_percent ?? 15);
    const price = Number(row.price ?? 0);
    const isFree = price <= 0;

    let purchaseId = existing?.id ?? null;
    let license = existing?.license_code ?? null;

    if (!purchaseId) {
      const { data: code, error: codeErr } = await supabaseAdmin.rpc("gen_license_code");
      if (codeErr || !code) throw new Response("Falha ao gerar licença", { status: 500 });

      const { data: inserted, error } = await supabaseAdmin
        .from("purchases")
        .insert({
          license_code: code as unknown as string,
          buyer_id: context.userId,
          material_id: isKit ? null : row.id,
          kit_id: isKit ? row.id : null,
          author_id: row.author_id,
          amount: price,
          platform_fee_percent: isFree ? 0 : feePercent,
          platform_fee: isFree ? 0 : Number(((price * feePercent) / 100).toFixed(2)),
          status: isFree ? "pago" : "pendente",
          payment_provider: isFree ? "gratuito" : "mercadopago",
          paid_at: isFree ? new Date().toISOString() : null,
        })
        .select("id,license_code,status")
        .single();
      if (error) throw new Response(error.message, { status: 500 });
      purchaseId = inserted.id;
      license = inserted.license_code;
      if (isFree) return { status: "pago" as const, license, url: null };
    }

    if (isFree) return { status: "pago" as const, license, url: null };

    const { createPreference } = await import("@/lib/mercadopago.server");
    const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const itemPath = isKit ? `/kit/${row.id}` : `/material/${row.id}`;

    const { url } = await createPreference({
      purchaseId: purchaseId!,
      title: row.title,
      price,
      buyerEmail: userRow?.user?.email ?? null,
      successUrl: `${data.origin}${itemPath}?pagamento=sucesso`,
      failureUrl: `${data.origin}${itemPath}?pagamento=falha`,
      notificationUrl: `${data.origin}/api/public/mercadopago-webhook`,
    });

    return { status: "pendente" as const, license, url };
  });

/** Consulta o status de uma compra do próprio usuário (após voltar do checkout). */
export const getPurchaseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { materialId?: string; kitId?: string }) => {
    const hasMaterial = !!input?.materialId;
    const hasKit = !!input?.kitId;
    if (hasMaterial === hasKit) throw new Response("Invalid input", { status: 400 });
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const column = data.kitId ? "kit_id" : "material_id";
    const { data: row } = await supabaseAdmin
      .from("purchases")
      .select("status,license_code")
      .eq("buyer_id", context.userId)
      .eq(column, (data.kitId ?? data.materialId)!)
      .in("status", ["pendente", "pago"])
      .maybeSingle();
    return { status: row?.status ?? null, license: row?.license_code ?? null };
  });
