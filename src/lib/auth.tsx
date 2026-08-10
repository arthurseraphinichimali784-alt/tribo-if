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

/**
 * Espelho da sessão em cookie de longa duração.
 * Alguns navegadores (Brave, modo de privacidade rígida) limpam o localStorage
 * ao fechar o site, o que derrubava o login. O cookie serve de backup para
 * restaurar a sessão na próxima visita.
 */
const COOKIE = "sh_sess";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

function writeSessionCookie(s: Session | null) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (!s?.refresh_token || !s?.access_token) {
    document.cookie = `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    return;
  }
  const value = encodeURIComponent(JSON.stringify({ a: s.access_token, r: s.refresh_token }));
  document.cookie = `${COOKIE}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function readSessionCookie(): { access_token: string; refresh_token: string } | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1)));
    if (!parsed?.a || !parsed?.r) return null;
    return { access_token: parsed.a, refresh_token: parsed.r };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setAnalyticsUser(s?.user?.id ?? null);
      writeSessionCookie(event === "SIGNED_OUT" ? null : s);
      if (event === "SIGNED_OUT") setReady(true);
    });

    void (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("[auth] getSession error", error);

      let current = data.session;
      if (!current) {
        // localStorage vazio (navegador limpou): tenta restaurar pelo cookie.
        const backup = readSessionCookie();
        if (backup) {
          const restored = await supabase.auth.setSession(backup);
          if (restored.error) writeSessionCookie(null);
          else current = restored.data.session;
        }
      }

      setSession(current);
      setAnalyticsUser(current?.user?.id ?? null);
      writeSessionCookie(current);
      setReady(true);
    })();

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
