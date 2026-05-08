import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

export function useFavorite(materialId: string) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setSaved(false); return; }
    supabase.from("favorites")
      .select("material_id")
      .eq("user_id", user.id)
      .eq("material_id", materialId)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, materialId]);

  const toggle = async () => {
    if (!user) { toast.error("Faça login para salvar"); return; }
    if (busy) return;
    setBusy(true);
    if (saved) {
      const { error } = await supabase.from("favorites")
        .delete().eq("user_id", user.id).eq("material_id", materialId);
      if (!error) { setSaved(false); track("material_unsave", { entity_type: "material", entity_id: materialId }); }
      else toast.error("Erro ao remover");
    } else {
      const { error } = await supabase.from("favorites")
        .insert({ user_id: user.id, material_id: materialId });
      if (!error) { setSaved(true); toast.success("Salvo nos seus favoritos"); track("material_save", { entity_type: "material", entity_id: materialId }); }
      else toast.error("Erro ao salvar");
    }
    setBusy(false);
  };

  return { saved, busy, toggle };
}
