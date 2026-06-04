import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  type: "comment" | "reply" | "like" | "follow" | "badge" | "report_resolved" | "material_featured" | "system";
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
  actor_id: string | null;
  material_id: string | null;
}

export function useNotifications(userId: string | undefined) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!userId) { setItems([]); setLoading(false); return; }
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!cancelled) {
        setItems((data ?? []) as any);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (p) => setItems((prev) => [p.new as any, ...prev].slice(0, 50))
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (p) => setItems((prev) => prev.map((n) => n.id === (p.new as any).id ? p.new as any : n))
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [userId]);

  const markAllRead = async () => {
    if (!userId || unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  };

  const markOneRead = async (id: string) => {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  return { items, loading, unread, markAllRead, markOneRead, remove };
}
