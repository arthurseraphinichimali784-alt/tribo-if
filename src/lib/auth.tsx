import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setAnalyticsUser } from "@/lib/analytics";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  ready: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, loading: true, ready: false, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setAnalyticsUser(s?.user?.id ?? null);
      if (event === "SIGNED_OUT") setReady(true);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error("[auth] getSession error", error);
      setSession(data.session);
      setAnalyticsUser(data.session?.user?.id ?? null);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      user: session?.user ?? null,
      session,
      loading: !ready,
      ready,
      signOut: async () => { await supabase.auth.signOut(); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
