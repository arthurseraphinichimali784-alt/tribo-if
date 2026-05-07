import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function useMaterialLike(materialId: string, initialLikes: number) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setLiked(false); return; }
    supabase.from("material_likes")
      .select("material_id")
      .eq("user_id", user.id)
      .eq("material_id", materialId)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [user, materialId]);

  const toggle = async () => {
    if (!user) { toast.error("Faça login para curtir"); return; }
    if (busy) return;
    setBusy(true);
    if (liked) {
      const { error } = await supabase.from("material_likes")
        .delete().eq("user_id", user.id).eq("material_id", materialId);
      if (error) { console.error(error); toast.error("Erro ao descurtir"); }
      else { setLiked(false); setLikes((n) => Math.max(0, n - 1)); }
    } else {
      const { error } = await supabase.from("material_likes")
        .insert({ user_id: user.id, material_id: materialId });
      if (error) { console.error(error); toast.error("Erro ao curtir"); }
      else { setLiked(true); setLikes((n) => n + 1); toast.success("+5 XP para o autor!"); }
    }
    setBusy(false);
  };

  return { likes, liked, busy, toggle };
}
