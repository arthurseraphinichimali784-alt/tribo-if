import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  GraduationCap, LogIn, KeyRound, Mail, ArrowLeft, Eye, EyeOff,
  Check, X, Loader2, Sparkles, Trophy, Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: { mode?: unknown; redirect?: unknown }) => ({
    mode: s.mode === "signup" ? ("signup" as const) : ("login" as const),
    redirect: typeof s.redirect === "string" && s.redirect.startsWith("/") ? s.redirect : undefined,
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Email inválido").max(255);
const pwSchema = z.string().min(6, "Mínimo 6 caracteres").max(100);
const usernameSchema = z.string().trim().min(3, "Mínimo 3 caracteres").max(30)
  .regex(/^[a-zA-Z0-9_]+$/, "Só letras, números e _");

function pwStrength(pw: string) {
  let n = 0;
  if (pw.length >= 6) n++;
  if (pw.length >= 10) n++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) n++;
  if (/\d/.test(pw)) n++;
  if (/[^A-Za-z0-9]/.test(pw)) n++;
  return Math.min(n, 4);
}
const STRENGTH = [
  { label: "Muito fraca", cls: "bg-destructive" },
  { label: "Fraca", cls: "bg-destructive" },
  { label: "Razoável", cls: "bg-warning" },
  { label: "Boa", cls: "bg-primary" },
  { label: "Excelente", cls: "bg-success" },
];

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.85 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.67-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.67 2.84C6.71 7.29 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-1.5 text-xs", ok ? "text-success" : "text-muted-foreground")}>
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-50" />}
      {children}
    </li>
  );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className={cn("pr-10", props.className)} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function AuthPage() {
  const { mode, redirect } = Route.useSearch();
  const nav = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">(mode);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailInUse, setEmailInUse] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  // signup live state
  const [su, setSu] = useState({ username: "", full_name: "", email: "", password: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const dest = redirect ?? "/dashboard";
  useEffect(() => {
    if (user) nav({ to: dest as any, search: {} as any });
  }, [user, nav, dest]);

  const errs = useMemo(() => ({
    username: su.username ? usernameSchema.safeParse(su.username).error?.issues[0]?.message : undefined,
    email: su.email ? emailSchema.safeParse(su.email).error?.issues[0]?.message : undefined,
    password: su.password ? pwSchema.safeParse(su.password).error?.issues[0]?.message : undefined,
  }), [su]);

  const strength = pwStrength(su.password);
  const canSignup = !errs.username && !errs.email && !errs.password && su.username && su.email && su.password;

  const signInGoogle = async () => {
    setGoogleLoading(true);
    try {
      if (redirect) sessionStorage.setItem("post_auth_redirect", redirect);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Não foi possível entrar com Google. Tente novamente.");
        return;
      }
      if (result.redirected) return;
      nav({ to: dest as any, search: {} as any });
    } catch {
      toast.error("Não foi possível entrar com Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const onLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const email = emailSchema.parse(fd.get("email"));
      const password = pwSchema.parse(fd.get("password"));
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (/invalid login credentials/i.test(error.message)) throw new Error("Email ou senha incorretos.");
        if (/email not confirmed/i.test(error.message)) throw new Error("Confirme seu email antes de entrar. Verifique sua caixa de entrada.");
        throw error;
      }
      toast.success("Bem-vindo de volta! 👋");
      nav({ to: dest as any, search: {} as any });
    } catch (err: any) {
      toast.error(err?.issues?.[0]?.message ?? err.message ?? "Erro ao entrar");
    } finally { setLoading(false); }
  };

  const onSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const email = emailSchema.parse(su.email);
      const password = pwSchema.parse(su.password);
      const username = usernameSchema.parse(su.username);
      const full_name = su.full_name.trim().slice(0, 100);
      const is_teacher = fd.get("is_teacher") === "on";
      setLoading(true);

      const { data: taken } = await supabase
        .from("public_profiles" as any)
        .select("username")
        .ilike("username", username)
        .maybeSingle();
      if (taken) {
        setLoading(false);
        toast.error("Esse nome de usuário já está em uso. Escolha outro.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}${dest}`,
          data: { username, full_name, is_teacher },
        },
      });
      if (error) throw error;
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setDuplicateEmail(email);
        setEmailInUse(true);
        setLoading(false);
        return;
      }
      setSentTo(email);
    } catch (err: any) {
      toast.error(err?.issues?.[0]?.message ?? err.message ?? "Erro ao cadastrar");
    } finally { setLoading(false); }
  };

  const sendReset = async (email: string) => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { toast.error("Email inválido"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message ?? "Erro ao enviar email");
    else {
      setForgotOpen(false);
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" style={{ background: "var(--gradient-hero)" }}>
      {/* Painel social / prova de valor */}
      <aside className="hidden lg:flex flex-col justify-center px-14 gap-8">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center btn-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold">Study<span className="text-gradient">Hub</span> IF</span>
        </Link>
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-3">
            Estude com quem já<br /><span className="text-gradient">passou no IF</span>
          </h1>
          <p className="text-muted-foreground max-w-sm">
            Resumos, flashcards e simulados da comunidade. Ganhe XP, suba de nível e construa sua reputação.
          </p>
        </div>
        <ul className="space-y-4">
          {[
            { icon: Sparkles, t: "Materiais grátis e premium", d: "Filtre por matéria, tipo e dificuldade" },
            { icon: Trophy, t: "XP, níveis e badges", d: "Sua reputação cresce a cada material publicado" },
            { icon: Users, t: "Comunidade ativa", d: "Comente, siga autores e salve seus favoritos" },
          ].map((f) => (
            <li key={f.t} className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm">{f.t}</div>
                <div className="text-xs text-muted-foreground">{f.d}</div>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center btn-glow">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold">Study<span className="text-gradient">Hub</span> IF</span>
          </Link>

          {sentTo ? (
            <div className="glass-strong rounded-3xl p-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-display font-bold mb-2">Confirme seu email</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enviamos um link de confirmação para <strong className="text-foreground">{sentTo}</strong>.
                Clique nele para ativar sua conta.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    const { error } = await supabase.auth.resend({ type: "signup", email: sentTo });
                    setLoading(false);
                    if (error) toast.error(error.message);
                    else toast.success("Email reenviado!");
                  }}
                >
                  Reenviar email
                </Button>
                <Button variant="ghost" onClick={() => { setSentTo(null); setTab("login"); }}>
                  Já confirmei — fazer login
                </Button>
              </div>
            </div>
          ) : (
            <div className="glass-strong rounded-3xl p-8">
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="grid grid-cols-2 w-full mb-6">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                </TabsList>

                <Button
                  type="button"
                  variant="outline"
                  onClick={signInGoogle}
                  disabled={googleLoading}
                  className="w-full h-11 gap-2 mb-4"
                >
                  {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                  Continuar com Google
                </Button>
                <div className="relative mb-5">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
                  <div className="relative flex justify-center text-[11px] uppercase tracking-wide">
                    <span className="bg-card/60 backdrop-blur px-2 text-muted-foreground">ou com email</span>
                  </div>
                </div>

                <TabsContent value="login">
                  <form onSubmit={onLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@email.com" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Senha</Label>
                        <button
                          type="button"
                          onClick={() => setForgotOpen(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                      <PasswordInput id="password" name="password" autoComplete="current-password" required />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Entrando...</> : "Entrar"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Novo por aqui?{" "}
                      <button type="button" className="text-primary hover:underline" onClick={() => setTab("signup")}>
                        Criar conta grátis
                      </button>
                    </p>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={onSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="username">Usuário</Label>
                        <Input
                          id="username" required placeholder="meu_user" autoComplete="username"
                          value={su.username}
                          onChange={(e) => setSu({ ...su, username: e.target.value.replace(/\s/g, "") })}
                          onBlur={() => setTouched({ ...touched, username: true })}
                          aria-invalid={!!errs.username}
                        />
                        {errs.username && <p className="text-[11px] text-destructive mt-1">{errs.username}</p>}
                      </div>
                      <div>
                        <Label htmlFor="full_name">Nome</Label>
                        <Input
                          id="full_name" placeholder="Seu nome" autoComplete="name"
                          value={su.full_name}
                          onChange={(e) => setSu({ ...su, full_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email2">Email</Label>
                      <Input
                        id="email2" type="email" required autoComplete="email" placeholder="voce@email.com"
                        value={su.email}
                        onChange={(e) => setSu({ ...su, email: e.target.value })}
                        aria-invalid={!!errs.email}
                      />
                      {errs.email && <p className="text-[11px] text-destructive mt-1">{errs.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="password2">Senha</Label>
                      <PasswordInput
                        id="password2" required autoComplete="new-password"
                        value={su.password}
                        onChange={(e) => setSu({ ...su, password: e.target.value })}
                      />
                      {su.password && (
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-1">
                            {[0, 1, 2, 3].map((i) => (
                              <span
                                key={i}
                                className={cn("h-1 flex-1 rounded-full transition-colors",
                                  i < strength ? STRENGTH[strength].cls : "bg-secondary")}
                              />
                            ))}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Força da senha: <strong className="text-foreground">{STRENGTH[strength].label}</strong>
                          </div>
                          <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                            <Rule ok={su.password.length >= 6}>6+ caracteres</Rule>
                            <Rule ok={/\d/.test(su.password)}>Um número</Rule>
                            <Rule ok={/[A-Z]/.test(su.password)}>Uma maiúscula</Rule>
                            <Rule ok={/[^A-Za-z0-9]/.test(su.password)}>Um símbolo</Rule>
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3">
                      <div>
                        <Label htmlFor="is_teacher" className="cursor-pointer">Sou professor/tutor</Label>
                        <p className="text-xs text-muted-foreground">Quero oferecer aulas</p>
                      </div>
                      <Switch id="is_teacher" name="is_teacher" />
                    </div>
                    <Button type="submit" disabled={loading || !canSignup} className="w-full h-11 bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Criando...</> : "Criar conta grátis"}
                    </Button>
                    <p className="text-center text-[11px] text-muted-foreground">
                      Ao criar a conta você concorda em manter a comunidade respeitosa.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Esqueci a senha */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="glass-strong rounded-3xl border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Recuperar senha</DialogTitle>
            <DialogDescription>
              Digite seu email e enviaremos um link para criar uma nova senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="email" placeholder="voce@email.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            <Button
              disabled={loading}
              onClick={() => sendReset(forgotEmail)}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow"
            >
              <KeyRound className="h-4 w-4 mr-2" /> Enviar link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email já cadastrado */}
      <Dialog open={emailInUse} onOpenChange={setEmailInUse}>
        <DialogContent className="glass-strong rounded-3xl border-0 sm:max-w-md text-center">
          <DialogHeader className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/15 flex items-center justify-center">
              <Mail className="h-7 w-7 text-amber-400" />
            </div>
            <DialogTitle className="text-xl font-display">Email já cadastrado</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              O email <strong className="text-foreground">{duplicateEmail}</strong> já possui uma conta.
              <br />O que você deseja fazer?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-2">
            <Button
              onClick={() => { setEmailInUse(false); setTab("login"); }}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow"
            >
              <LogIn className="h-4 w-4 mr-2" /> Fazer login
            </Button>
            <Button variant="outline" onClick={() => { setEmailInUse(false); sendReset(duplicateEmail); }} className="w-full">
              <KeyRound className="h-4 w-4 mr-2" /> Recuperar senha
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setEmailInUse(false); setDuplicateEmail(""); }}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao cadastro
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
