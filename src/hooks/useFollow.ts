import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function useFollow(targetId: string | undefined) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!targetId) return;
    const [{ count }, mine] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", targetId),
      user
        ? supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", targetId).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);
    setFollowers(count ?? 0);
    setFollowing(!!mine.data);
  }, [targetId, user]);

  useEffect(() => { void load(); }, [load]);

  const toggle = async () => {
    if (!user) { toast.error("Faça login para seguir"); return; }
    if (!targetId || targetId === user.id || busy) return;
    setBusy(true);
    if (following) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
      if (!error) { setFollowing(false); setFollowers((n) => Math.max(0, n - 1)); }
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
      if (!error) { setFollowing(true); setFollowers((n) => n + 1); toast.success("Seguindo!"); }
    }
    setBusy(false);
  };

  return { following, followers, busy, toggle, isSelf: user?.id === targetId };
}
