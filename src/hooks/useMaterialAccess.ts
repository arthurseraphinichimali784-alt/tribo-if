import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMaterialAccess } from "@/lib/purchases.functions";
import { useAuth } from "@/lib/auth";

export interface MaterialAccess {
  hasAccess: boolean;
  isAuthor: boolean;
  isFree: boolean;
  hasFile: boolean;
  previewPages: number;
  license: string | null;
}

/** Estado de licença/acesso resolvido no servidor (nunca no frontend). */
export function useMaterialAccess(materialId: string | undefined) {
  const { user, ready } = useAuth();
  const fetchAccess = useServerFn(getMaterialAccess);
  const [access, setAccess] = useState<MaterialAccess | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!materialId || !user) { setAccess(null); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetchAccess({ data: { materialId } });
      setAccess(res as MaterialAccess);
    } catch {
      setAccess(null);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId, user?.id]);

  useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  return { access, loading, refresh };
}

/** Busca o arquivo protegido pela rota autenticada e devolve um blob URL. */
export async function fetchProtectedFile(
  accessToken: string,
  materialId: string,
  mode: "preview" | "full" | "download",
): Promise<Blob> {
  const res = await fetch("/api/public/material-file", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ materialId, mode }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}
