import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { GraduationCap, LogIn, KeyRound, Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ mode: (s.mode as string) === "signup" ? "signup" : "login" }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Email inválido").max(255);
const pwSchema = z.string().min(6, "Mínimo 6 caracteres").max(100);
const usernameSchema = z.string().trim().min(3, "Mínimo 3 caracteres").max(30).regex(/^[a-zA-Z0-9_]+$/, "Só letras, números e _");

function AuthPage() {
  const { mode } = Route.useSearch();
  const nav = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState(mode);
  const [loading, setLoading] = useState(false);
  const [emailInUse, setEmailInUse] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState("");

  useEffect(() => { if (user) nav({ to: "/dashboard" }); }, [user, nav]);

  const onLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const email = emailSchema.parse(fd.get("email"));
      const password = pwSchema.parse(fd.get("password"));
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Bem-vindo de volta!");
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao entrar");
    } finally { setLoading(false); }
  };

  const onSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const email = emailSchema.parse(fd.get("email"));
      const password = pwSchema.parse(fd.get("password"));
      const username = usernameSchema.parse(fd.get("username"));
      const full_name = String(fd.get("full_name") || "").trim().slice(0, 100);
      const is_teacher = fd.get("is_teacher") === "on";
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { username, full_name, is_teacher },
        },
      });
      if (error) throw error;
      // Supabase retorna identities=[] quando o email já está cadastrado (anti-enumeration)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setDuplicateEmail(email);
        setEmailInUse(true);
        setLoading(false);
        return;
      }
      toast.success("Conta criada! Verifique seu email para confirmar antes de entrar.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao cadastrar");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--gradient-hero)" }}>
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center btn-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold">Study<span className="text-gradient">Hub</span> IF</span>
        </Link>

        <div className="glass-strong rounded-3xl p-8">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={onLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="voce@email.com" />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={onSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="username">Usuário</Label>
                    <Input id="username" name="username" required placeholder="meu_user" />
                  </div>
                  <div>
                    <Label htmlFor="full_name">Nome</Label>
                    <Input id="full_name" name="full_name" placeholder="Seu nome" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" name="email" type="email" required />
                </div>
                <div>
                  <Label htmlFor="password2">Senha</Label>
                  <Input id="password2" name="password" type="password" required minLength={6} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3">
                  <div>
                    <Label htmlFor="is_teacher" className="cursor-pointer">Sou professor/tutor</Label>
                    <p className="text-xs text-muted-foreground">Quero oferecer aulas</p>
                  </div>
                  <Switch id="is_teacher" name="is_teacher" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow">
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
