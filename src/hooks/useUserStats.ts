import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subjectLabel } from "@/lib/constants";

export interface UserStats {
  trust_score: number;
  xp: number;
  level: number;
  next_level_xp: number;
  progress_pct: number;
  specialties: { subject: string; label: string; score: number }[];
}

export function useUserStats(userId: string | undefined) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setStats(null); setLoading(false); return; }
    const [p, s] = await Promise.all([
      supabase.from("profiles").select("trust_score,xp,level").eq("id", userId).maybeSingle(),
      supabase.from("subject_scores").select("subject,score").eq("user_id", userId).order("score", { ascending: false }),
    ]);
    const xp = p.data?.xp ?? 0;
    const level = p.data?.level ?? 1;
    const next_level_xp = level * 100;
    const progress_pct = Math.min(100, ((xp % 100) / 100) * 100);
    setStats({
      trust_score: Number(p.data?.trust_score ?? 0),
      xp, level, next_level_xp, progress_pct,
      specialties: (s.data ?? []).map((x: any) => ({
        subject: x.subject, label: subjectLabel(x.subject), score: x.score,
      })),
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    load();
    if (!userId) return;
    const channel = supabase
      .channel(`user-stats-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "subject_scores", filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  return { stats, loading, reload: load };
}
