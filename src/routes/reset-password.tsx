import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({ component: ResetPassword });

const pwSchema = z.string().min(6, "Mínimo 6 caracteres").max(100);

function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) { setValid(true); setReady(true); }
    });
    supabase.auth.getSession().then(({ data }) => {
      setValid(!!data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = pwSchema.safeParse(pw);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (pw !== pw2) { toast.error("As senhas não coincidem"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha alterada com sucesso!");
    nav({ to: "/dashboard" });
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
          <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-display font-bold mb-1">Criar nova senha</h1>

          {!ready ? (
            <p className="text-sm text-muted-foreground">Verificando link...</p>
          ) : !valid ? (
            <>
              <p className="text-sm text-muted-foreground mb-5">
                Este link expirou ou é inválido. Peça um novo link de recuperação.
              </p>
              <Link to="/auth" search={{ mode: "login" } as any}>
                <Button className="w-full">Voltar ao login</Button>
              </Link>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="pw">Nova senha</Label>
                <div className="relative">
                  <Input id="pw" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} required className="pr-10" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="pw2">Confirmar senha</Label>
                <Input id="pw2" type={show ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
                {pw2 && pw !== pw2 && <p className={cn("text-[11px] mt-1 text-destructive")}>As senhas não coincidem</p>}
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
