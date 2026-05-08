import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

// Records a material_views row with duration when the user leaves the page.
export function useTrackView(materialId: string | undefined, userId: string | null | undefined) {
  useEffect(() => {
    if (!materialId) return;
    const start = Date.now();
    track("material_view", { entity_type: "material", entity_id: materialId });

    return () => {
      const duration = Math.round((Date.now() - start) / 1000);
      // fire and forget
      void supabase.from("material_views").insert({
        user_id: userId ?? null,
        material_id: materialId,
        duration_seconds: duration,
      });
    };
  }, [materialId, userId]);
}
