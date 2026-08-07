import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface LeaderEntry {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  trust_score: number;
  score: number;
  delta: number;
}

/**
 * Public leaderboard.
 * - period "week": pontos ganhos nos últimos 7 dias (likes recebidos x3 + materiais publicados x10)
 * - period "all": XP acumulado
 */
export const getLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((input: { period?: "week" | "all"; limit?: number }) => input)
  .handler(async ({ data }) => {
    const limit = Math.min(data.limit ?? 5, 20);
    const period = data.period === "all" ? "all" : "week";

    if (period === "all") {
      const { data: rows } = await supabaseAdmin
        .from("profiles")
        .select("id,username,full_name,avatar_url,xp,level,trust_score")
        .order("xp", { ascending: false })
        .limit(limit);
      return ((rows ?? []) as any[]).map((r) => ({
        ...r,
        score: r.xp ?? 0,
        delta: 0,
      })) as LeaderEntry[];
    }

    const since = new Date(Date.now() - 7 * 86400_000).toISOString();

    const [{ data: likes }, { data: pubs }] = await Promise.all([
      supabaseAdmin
        .from("material_likes")
        .select("material_id,created_at,materials(author_id)")
        .gte("created_at", since)
        .limit(2000),
      supabaseAdmin
        .from("materials")
        .select("author_id")
        .eq("published", true)
        .gte("created_at", since)
        .limit(1000),
    ]);

    const points = new Map<string, number>();
    const add = (id: string | null | undefined, n: number) => {
      if (!id) return;
      points.set(id, (points.get(id) ?? 0) + n);
    };
    (likes ?? []).forEach((l: any) => add(l.materials?.author_id, 3));
    (pubs ?? []).forEach((m: any) => add(m.author_id, 10));

    const ranked = [...points.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);

    if (ranked.length === 0) {
      const { data: rows } = await supabaseAdmin
        .from("profiles")
        .select("id,username,full_name,avatar_url,xp,level,trust_score")
        .order("xp", { ascending: false })
        .limit(limit);
      return ((rows ?? []) as any[]).map((r) => ({ ...r, score: r.xp ?? 0, delta: 0 })) as LeaderEntry[];
    }

    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id,username,full_name,avatar_url,xp,level,trust_score")
      .in("id", ranked.map(([id]) => id));

    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return ranked
      .map(([id, score]) => {
        const p: any = map.get(id);
        if (!p) return null;
        return { ...p, score, delta: score } as LeaderEntry;
      })
      .filter(Boolean) as LeaderEntry[];
  });
