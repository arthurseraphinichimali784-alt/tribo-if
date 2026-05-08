import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Streak { current_streak: number; longest_streak: number; last_activity_date: string | null }

export function useStreak(userId: string | undefined) {
  const [streak, setStreak] = useState<Streak | null>(null);

  useEffect(() => {
    if (!userId) { setStreak(null); return; }
    const load = () => supabase.from("user_streaks")
      .select("current_streak,longest_streak,last_activity_date")
      .eq("user_id", userId).maybeSingle()
      .then(({ data }) => setStreak((data as any) ?? { current_streak: 0, longest_streak: 0, last_activity_date: null }));
    load();
    const ch = supabase
      .channel(`streak-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_streaks", filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  return streak;
}
