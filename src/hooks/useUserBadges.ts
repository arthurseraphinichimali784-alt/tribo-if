import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BadgeRow { code: string; label: string; description: string | null; icon: string | null; color: string | null; awarded_at: string }

export function useUserBadges(userId: string | undefined) {
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  useEffect(() => {
    if (!userId) { setBadges([]); return; }
    supabase.from("user_badges")
      .select("awarded_at,badges(code,label,description,icon,color)")
      .eq("user_id", userId)
      .order("awarded_at", { ascending: false })
      .then(({ data }) => {
        setBadges(((data ?? []) as any[]).map((r) => ({ ...(r.badges as any), awarded_at: r.awarded_at })));
      });
  }, [userId]);
  return badges;
}
