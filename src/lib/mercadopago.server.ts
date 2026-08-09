/** Helpers do Mercado Pago — somente servidor. */

const API = "https://api.mercadopago.com";

function token() {
  const t = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!t) throw new Response("Pagamentos não configurados", { status: 500 });
  return t;
}

export type PreferenceInput = {
  purchaseId: string;
  title: string;
  price: number;
  buyerEmail?: string | null;
  successUrl: string;
  failureUrl: string;
  notificationUrl: string;
};

/** Cria uma preferência de Checkout Pro (Pix + cartão + boleto). */
export async function createPreference(input: PreferenceInput) {
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          id: input.purchaseId,
          title: input.title.slice(0, 120),
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(input.price.toFixed(2)),
        },
      ],
      payer: input.buyerEmail ? { email: input.buyerEmail } : undefined,
      external_reference: input.purchaseId,
      notification_url: input.notificationUrl,
      statement_descriptor: "STUDYHUBIF",
      back_urls: {
        success: input.successUrl,
        pending: input.successUrl,
        failure: input.failureUrl,
      },
      auto_return: "approved",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Mercado Pago preference failed [${res.status}]: ${body}`);
    throw new Response("Falha ao criar checkout", { status: 502 });
  }

  const json = (await res.json()) as { id: string; init_point?: string; sandbox_init_point?: string };
  const url = json.init_point ?? json.sandbox_init_point;
  if (!url) throw new Response("Checkout indisponível", { status: 502 });
  return { preferenceId: json.id, url };
}

/** Busca um pagamento no Mercado Pago (fonte da verdade do status). */
export async function getPayment(paymentId: string) {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Mercado Pago payment fetch failed [${res.status}]: ${body}`);
    return null;
  }
  return (await res.json()) as {
    id: number;
    status: string;
    external_reference?: string | null;
    transaction_amount?: number;
  };
}
