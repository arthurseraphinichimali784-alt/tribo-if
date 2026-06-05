import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Trending materials for anonymous/public callers. No personal data; safe.
export const getPublicTrending = createServerFn({ method: "GET" })
  .inputValidator((input: { limit?: number }) => input)
  .handler(async ({ data }) => {
    const limit = Math.min(data.limit ?? 12, 24);
    const { data: trending } = await supabaseAdmin
      .from("materials")
      .select("id,title,description,subject,type,difficulty,price,downloads,rating,cover_url,likes,saves_count,profiles(username,avatar_url)")
      .eq("published", true)
      .order("likes", { ascending: false })
      .limit(limit);
    return { reason: "trending" as const, items: trending ?? [] };
  });

// Personalized recommendations for the SIGNED-IN user. The caller-supplied
// userId is intentionally ignored to prevent IDOR — identity is derived from
// the auth middleware context.
export const getRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number }) => input)
  .handler(async ({ data, context }) => {
    const limit = Math.min(data.limit ?? 12, 24);
    const userId = context.userId;

    const sinceIso = new Date(Date.now() - 60 * 86400_000).toISOString();
    const [{ data: views }, { data: likes }, { data: favs }] = await Promise.all([
      supabaseAdmin.from("material_views").select("material_id,materials(subject)").eq("user_id", userId).gte("created_at", sinceIso).limit(500),
      supabaseAdmin.from("material_likes").select("material_id,materials(subject)").eq("user_id", userId).limit(500),
      supabaseAdmin.from("favorites").select("material_id,materials(subject)").eq("user_id", userId).limit(500),
    ]);

    const score = new Map<string, number>();
    const bump = (subj: string | undefined, w: number) => { if (!subj) return; score.set(subj, (score.get(subj) ?? 0) + w); };
    (views ?? []).forEach((r: any) => bump(r.materials?.subject, 1));
    (likes ?? []).forEach((r: any) => bump(r.materials?.subject, 3));
    (favs ?? []).forEach((r: any) => bump(r.materials?.subject, 5));

    const top = [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);

    if (top.length === 0) {
      const { data: trending } = await supabaseAdmin
        .from("materials")
        .select("id,title,description,subject,type,difficulty,price,downloads,rating,cover_url,likes,saves_count,profiles(username,avatar_url)")
        .eq("published", true)
        .order("likes", { ascending: false })
        .limit(limit);
      return { reason: "trending" as const, items: trending ?? [], topSubjects: [] as string[] };
    }

    const seenIds = new Set([...(views ?? []), ...(likes ?? []), ...(favs ?? [])].map((r: any) => r.material_id));

    const { data: recs } = await supabaseAdmin
      .from("materials")
      .select("id,title,description,subject,type,difficulty,price,downloads,rating,cover_url,likes,saves_count,profiles(username,avatar_url)")
      .eq("published", true)
      .in("subject", top as any)
      .order("rating", { ascending: false })
      .order("likes", { ascending: false })
      .limit(limit * 2);

    const filtered = (recs ?? []).filter((m: any) => !seenIds.has(m.id)).slice(0, limit);
    return { reason: "personalized" as const, items: filtered, topSubjects: top };
  });

// Trending this week
export const getTrending = createServerFn({ method: "GET" })
  .inputValidator((input: { limit?: number }) => input)
  .handler(async ({ data }) => {
    const limit = Math.min(data.limit ?? 8, 20);
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: items } = await supabaseAdmin
      .from("materials")
      .select("id,title,description,subject,type,difficulty,price,downloads,rating,cover_url,likes,saves_count,profiles(username,avatar_url)")
      .eq("published", true)
      .gte("created_at", since)
      .order("likes", { ascending: false })
      .order("downloads", { ascending: false })
      .limit(limit);
    if (items && items.length >= 4) return items;
    // fallback to all-time if not enough recent data
    const { data: fallback } = await supabaseAdmin
      .from("materials")
      .select("id,title,description,subject,type,difficulty,price,downloads,rating,cover_url,likes,saves_count,profiles(username,avatar_url)")
      .eq("published", true)
      .order("likes", { ascending: false })
      .limit(limit);
    return fallback ?? [];
  });

// Recent community activity (anonymized, public events only)
export const getActivity = createServerFn({ method: "GET" })
  .inputValidator((input: { limit?: number }) => input)
  .handler(async ({ data }) => {
    const limit = Math.min(data.limit ?? 10, 30);
    const { data: events } = await supabaseAdmin
      .from("analytics_events")
      .select("id,event_type,entity_id,created_at,metadata,user_id")
      .in("event_type", ["material_like", "material_save", "comment_create", "material_view"])
      .order("created_at", { ascending: false })
      .limit(limit * 3);

    if (!events || events.length === 0) return [];
    const matIds = [...new Set(events.map((e: any) => e.entity_id).filter(Boolean))];
    const userIds = [...new Set(events.map((e: any) => e.user_id).filter(Boolean))];
    const [{ data: mats }, { data: profs }] = await Promise.all([
      supabaseAdmin.from("materials").select("id,title,subject").in("id", matIds),
      supabaseAdmin.from("profiles").select("id,username,avatar_url").in("id", userIds),
    ]);
    const matMap = new Map((mats ?? []).map((m: any) => [m.id, m]));
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return events.slice(0, limit).map((e: any) => {
      // Strip user_id from the public response to avoid leaking UUIDs.
      const { user_id, ...safe } = e;
      return {
        ...safe,
        material: e.entity_id ? matMap.get(e.entity_id) ?? null : null,
        profiles: e.user_id ? profMap.get(e.user_id) ?? null : null,
      };
    });
  });
