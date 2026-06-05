import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Admin-only metrics dashboard data.
async function ensureAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);

    const now = Date.now();
    const d7 = new Date(now - 7 * 86400_000).toISOString();
    const d30 = new Date(now - 30 * 86400_000).toISOString();

    const [users, mats, events7, events30, topMatsByLikes, topMatsByDl, eventsDaily, viewsAgg] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("materials").select("id", { count: "exact", head: true }).eq("published", true),
      supabaseAdmin.from("analytics_events").select("user_id,created_at").gte("created_at", d7).limit(10000),
      supabaseAdmin.from("analytics_events").select("user_id,created_at,event_type").gte("created_at", d30).limit(20000),
      supabaseAdmin.from("materials").select("id,title,likes,downloads,subject").eq("published", true).order("likes", { ascending: false }).limit(10),
      supabaseAdmin.from("materials").select("id,title,likes,downloads,subject").eq("published", true).order("downloads", { ascending: false }).limit(10),
      supabaseAdmin.from("analytics_events").select("created_at").gte("created_at", d30).limit(20000),
      supabaseAdmin.from("material_views").select("duration_seconds").gte("created_at", d30).limit(10000),
    ]);

    const activeUsers7 = new Set((events7.data ?? []).map((e: any) => e.user_id).filter(Boolean)).size;

    // Daily counts (last 30 days)
    const daily = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400_000).toISOString().slice(0, 10);
      daily.set(d, 0);
    }
    (eventsDaily.data ?? []).forEach((e: any) => {
      const d = e.created_at.slice(0, 10);
      if (daily.has(d)) daily.set(d, (daily.get(d) ?? 0) + 1);
    });

    // Event type breakdown
    const byType = new Map<string, number>();
    (events30.data ?? []).forEach((e: any) => byType.set(e.event_type, (byType.get(e.event_type) ?? 0) + 1));

    // Subject popularity from top materials (simple proxy)
    const subjectAgg = new Map<string, number>();
    [...(topMatsByLikes.data ?? []), ...(topMatsByDl.data ?? [])].forEach((m: any) => {
      subjectAgg.set(m.subject, (subjectAgg.get(m.subject) ?? 0) + (m.likes + m.downloads));
    });

    const durations = (viewsAgg.data ?? []).map((v: any) => v.duration_seconds || 0).filter((d: number) => d > 0 && d < 3600);
    const avgRead = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    return {
      totals: {
        users: users.count ?? 0,
        materials: mats.count ?? 0,
        active7d: activeUsers7,
        events30d: events30.data?.length ?? 0,
        avg_read_seconds: avgRead,
      },
      daily: [...daily.entries()].map(([date, count]) => ({ date, count })),
      byEventType: [...byType.entries()].map(([type, count]) => ({ type, count })),
      topByLikes: topMatsByLikes.data ?? [],
      topByDownloads: topMatsByDl.data ?? [],
      subjectPopularity: [...subjectAgg.entries()].map(([subject, score]) => ({ subject, score })).sort((a, b) => b.score - a.score),
    };
  });

// Admin-only: list moderation reports.
export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { filter?: "pending" | "all" }) => input)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    let q = supabaseAdmin.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (data.filter === "pending") q = q.eq("status", "pending");
    const { data: rows, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });
    return rows ?? [];
  });

// Admin-only: update a report's status.
export const updateReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "resolved" | "rejected" }) => {
    if (!input.id || !["resolved", "rejected"].includes(input.status)) {
      throw new Response("Invalid input", { status: 400 });
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("reports")
      .update({ status: data.status, resolved_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });
