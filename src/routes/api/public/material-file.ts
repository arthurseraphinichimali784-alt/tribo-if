// Protected material file endpoint.
// The bucket is private and the client never receives the storage path or a
// permanent URL: every byte served here goes through auth + license checks.
import { createFileRoute } from "@tanstack/react-router";
import { userFromBearer, resolveAccess, logAccess, watermarkPdf } from "@/lib/access.server";

export const Route = createFileRoute("/api/public/material-file")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await userFromBearer(request.headers.get("Authorization"));
        if (!userId) return new Response("Nao autenticado", { status: 401 });

        let body: { materialId?: string; mode?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Requisicao invalida", { status: 400 });
        }
        const materialId = String(body.materialId ?? "");
        const mode = body.mode === "download" ? "download" : body.mode === "full" ? "full" : "preview";
        if (!/^[0-9a-f-]{36}$/i.test(materialId)) return new Response("Requisicao invalida", { status: 400 });

        const resolved = await resolveAccess(userId, materialId);
        if (!resolved) return new Response("Material nao encontrado", { status: 404 });
        const { material, hasAccess, license, buyerLabel } = resolved;

        if (!material.published && material.author_id !== userId) {
          return new Response("Material indisponivel", { status: 403 });
        }
        if (!material.file_path) return new Response("Material sem arquivo", { status: 404 });
        if ((mode === "full" || mode === "download") && !hasAccess) {
          return new Response("Licenca necessaria", { status: 403 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: blob, error } = await supabaseAdmin.storage
          .from("materials")
          .download(material.file_path);
        if (error || !blob) return new Response("Falha ao ler arquivo", { status: 500 });

        const isPdf = /\.pdf$/i.test(material.file_path);
        const buffer = await blob.arrayBuffer();
        const previewOnly = !hasAccess;

        let out: Uint8Array | ArrayBuffer = buffer;
        let contentType = blob.type || (isPdf ? "application/pdf" : "application/octet-stream");

        if (isPdf) {
          const footer = previewOnly
            ? "PREVIA GRATUITA - StudyHUB IF - adquira para acessar o material completo"
            : `Licenca ${license?.code ?? "SH-AUTOR"} - ${buyerLabel} - StudyHUB IF`;
          try {
            out = await watermarkPdf(buffer, footer, previewOnly ? Math.max(1, material.preview_pages) : undefined);
            contentType = "application/pdf";
          } catch (e) {
            console.error("[material-file] watermark falhou", e);
            if (previewOnly) return new Response("Previa indisponivel", { status: 422 });
            out = buffer;
          }
        } else if (previewOnly) {
          return new Response("Previa indisponivel para este formato", { status: 422 });
        }

        await logAccess({
          userId,
          materialId,
          purchaseId: license?.purchaseId ?? null,
          licenseCode: license?.code ?? null,
          accessType: mode === "download" ? "download" : previewOnly ? "preview" : "view",
        });

        if (mode === "download" && hasAccess) {
          await supabaseAdmin
            .from("materials")
            .update({ downloads: (await currentDownloads(materialId)) + 1 })
            .eq("id", materialId);
        }

        const bytes = out instanceof Uint8Array ? out : new Uint8Array(out);
        return new Response(bytes as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "private, no-store",
            "Content-Disposition":
              mode === "download"
                ? `attachment; filename="studyhub-${materialId.slice(0, 8)}.pdf"`
                : "inline",
          },
        });
      },
    },
  },
});

async function currentDownloads(materialId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("materials").select("downloads").eq("id", materialId).maybeSingle();
  return data?.downloads ?? 0;
}
