import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook do Mercado Pago.
 * A notificação nunca é confiada: o status é sempre relido na API do provedor
 * usando o access token do servidor antes de liberar qualquer licença.
 */
export const Route = createFileRoute("/api/public/mercadopago-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: any = null;
        try {
          body = await request.json();
        } catch {
          return new Response("ok");
        }

        const url = new URL(request.url);
        const type = body?.type ?? body?.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
        const paymentId = String(
          body?.data?.id ?? body?.resource ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "",
        ).replace(/[^0-9]/g, "");

        if (!paymentId || (type && !String(type).includes("payment"))) return new Response("ok");

        const { getPayment } = await import("@/lib/mercadopago.server");
        const payment = await getPayment(paymentId);
        if (!payment?.external_reference) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: purchase } = await supabaseAdmin
          .from("purchases")
          .select("id,status,amount")
          .eq("id", payment.external_reference)
          .maybeSingle();
        if (!purchase) return new Response("ok");

        if (payment.status === "approved") {
          // O valor pago precisa cobrir o preço registrado no banco.
          if (Number(payment.transaction_amount ?? 0) + 0.01 < Number(purchase.amount)) {
            console.error(`Pagamento ${paymentId} com valor abaixo do esperado`);
            return new Response("ok");
          }
          if (purchase.status !== "pago") {
            await supabaseAdmin
              .from("purchases")
              .update({
                status: "pago",
                paid_at: new Date().toISOString(),
                payment_provider: "mercadopago",
                external_payment_id: String(payment.id),
              })
              .eq("id", purchase.id);
          }
        } else if (["cancelled", "rejected", "refunded", "charged_back"].includes(payment.status)) {
          await supabaseAdmin
            .from("purchases")
            .update({
              status: payment.status === "refunded" || payment.status === "charged_back" ? "reembolsado" : "cancelado",
              external_payment_id: String(payment.id),
              refunded_at: payment.status === "refunded" ? new Date().toISOString() : null,
            })
            .eq("id", purchase.id);
        }

        return new Response("ok");
      },
      GET: async () => new Response("ok"),
    },
  },
});
