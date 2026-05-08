// Lightweight client-side event tracking with batching.
// Events flush every 5s or when buffer hits 10 items, plus on pagehide.
import { supabase } from "@/integrations/supabase/client";

export type EventType =
  | "page_view"
  | "material_view"
  | "material_download"
  | "material_like"
  | "material_save"
  | "material_unsave"
  | "comment_create"
  | "search"
  | "signup"
  | "login";

interface QueuedEvent {
  user_id: string | null;
  event_type: EventType;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
}

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | null = null;

export function setAnalyticsUser(id: string | null) {
  currentUserId = id;
}

async function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  try {
    await supabase.from("analytics_events").insert(
      batch.map((e) => ({
        user_id: e.user_id,
        event_type: e.event_type,
        entity_type: e.entity_type ?? null,
        entity_id: e.entity_id ?? null,
        metadata: (e.metadata ?? {}) as any,
      })),
    );
  } catch (err) {
    // swallow — analytics must never break UX
    console.warn("[analytics] flush failed", err);
  }
}

export function track(
  event_type: EventType,
  opts: { entity_type?: string; entity_id?: string; metadata?: Record<string, unknown> } = {},
) {
  queue.push({
    user_id: currentUserId,
    event_type,
    entity_type: opts.entity_type ?? null,
    entity_id: opts.entity_id ?? null,
    metadata: opts.metadata,
  });
  if (queue.length >= 10) { void flush(); return; }
  if (!timer) timer = setTimeout(() => void flush(), 5000);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => { void flush(); });
  window.addEventListener("beforeunload", () => { void flush(); });
}
