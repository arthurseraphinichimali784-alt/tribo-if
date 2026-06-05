import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LeaderRow { id: string; username: string; avatar_url: string | null; xp: number; level: number; trust_score: number }

export function useLeaderboard(limit = 5) {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("public_profiles" as any)
      .select("id,username,avatar_url,xp,level,trust_score")
      .order("xp", { ascending: false })
      .limit(limit)
      .then(({ data }) => { setRows((data ?? []) as any); setLoading(false); });
  }, [limit]);
  return { rows, loading };
}
