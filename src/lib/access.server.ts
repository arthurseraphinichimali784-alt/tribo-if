// Server-only helpers for material access control and PDF watermarking.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AccessKind = "preview" | "view" | "download";

/** Validates a Supabase bearer token and returns the user id, or null. */
export async function userFromBearer(authorization: string | null): Promise<string | null> {
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export interface AccessResult {
  material: {
    id: string;
    title: string;
    price: number;
    file_path: string | null;
    author_id: string;
    preview_pages: number;
    published: boolean;
  };
  hasAccess: boolean;
  license: { code: string; purchaseId: string } | null;
  buyerLabel: string;
}

/** Single source of truth: resolves material + access + license for a user. */
export async function resolveAccess(userId: string, materialId: string): Promise<AccessResult | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: material } = await supabaseAdmin
    .from("materials")
    .select("id,title,price,file_path,author_id,preview_pages,published")
    .eq("id", materialId)
    .maybeSingle();
  if (!material) return null;

  const { data: hasAccess } = await supabaseAdmin.rpc("has_material_access", {
    _user_id: userId,
    _material_id: materialId,
  });

  const { data: purchase } = await supabaseAdmin
    .from("purchases")
    .select("id,license_code,status")
    .eq("buyer_id", userId)
    .eq("material_id", materialId)
    .eq("status", "pago")
    .maybeSingle();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name,username")
    .eq("id", userId)
    .maybeSingle();

  return {
    material: material as AccessResult["material"],
    hasAccess: !!hasAccess,
    license: purchase ? { code: purchase.license_code, purchaseId: purchase.id } : null,
    buyerLabel: abbreviateName(profile?.full_name ?? profile?.username ?? "Usuário"),
  };
}

/** "Arthur Seraphini Chimali" -> "Arthur S." — no e-mail, no full personal data. */
export function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Usuário";
  if (parts.length === 1) return parts[0]!.slice(0, 24);
  return `${parts[0]!.slice(0, 20)} ${parts[1]![0]!.toUpperCase()}.`;
}

export async function logAccess(params: {
  userId: string;
  materialId: string;
  purchaseId?: string | null;
  licenseCode?: string | null;
  accessType: AccessKind;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("material_access_log").insert({
    user_id: params.userId,
    material_id: params.materialId,
    purchase_id: params.purchaseId ?? null,
    license_code: params.licenseCode ?? null,
    access_type: params.accessType,
  });
}

/** Keeps only glyphs the standard PDF font can encode (WinAnsi). */
function sanitize(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");
}

/**
 * Embeds a discreet watermark into every page of a PDF and optionally
 * truncates it to the first `maxPages` pages (limited preview).
 */
export async function watermarkPdf(
  bytes: ArrayBuffer,
  footer: string,
  maxPages?: number,
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import("pdf-lib");
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

  if (maxPages && pdf.getPageCount() > maxPages) {
    const remove = pdf.getPageIndices().slice(maxPages).reverse();
    for (const i of remove) pdf.removePage(i);
  }

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const label = sanitize(footer);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    // Rodapé discreto
    const size = 7.5;
    const textWidth = font.widthOfTextAtSize(label, size);
    page.drawRectangle({
      x: 0, y: 0, width, height: 16,
      color: rgb(1, 1, 1), opacity: 0.55,
    });
    page.drawText(label, {
      x: Math.max(8, (width - textWidth) / 2),
      y: 5,
      size,
      font,
      color: rgb(0.45, 0.45, 0.45),
      opacity: 0.9,
    });
    // Marca diagonal bem suave (não atrapalha a leitura)
    const diagSize = Math.min(28, width / 16);
    page.drawText(label, {
      x: width * 0.12,
      y: height * 0.35,
      size: diagSize,
      font,
      color: rgb(0.55, 0.55, 0.55),
      opacity: 0.07,
      rotate: degrees(35),
    });
  }

  return pdf.save();
}
