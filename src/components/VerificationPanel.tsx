import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { myVerifications, requestTeacherVerification } from "@/lib/verification.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BadgeCheck, Clock, Loader2, ShieldQuestion, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS: Record<string, { label: string; className: string; icon: any }> = {
  pendente: { label: "Em análise", className: "bg-warning/15 text-warning border-warning/30", icon: Clock },
  verificado: { label: "Verificado", className: "bg-success/15 text-success border-success/30", icon: BadgeCheck },
  rejeitado: { label: "Rejeitado", className: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
  nao_verificado: { label: "Não verificado", className: "bg-muted text-muted-foreground border-border", icon: ShieldQuestion },
};

export function VerificationPanel() {
  const { user } = useAuth();
  const request = useServerFn(requestTeacherVerification);
  const listMine = useServerFn(myVerifications);
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("nao_verificado");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ institution: "IFES", teachingArea: "", teachingRole: "", institutionalEmail: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: prof }, mine] = await Promise.all([
      supabase.from("profiles").select("verification_status,teaching_area,teaching_role,institute").eq("id", user.id).maybeSingle(),
      listMine().catch(() => [] as any[]),
    ]);
    setStatus(prof?.verification_status ?? "nao_verificado");
    setForm((f) => ({
      ...f,
      institution: prof?.institute || f.institution,
      teachingArea: prof?.teaching_area || f.teachingArea,
      teachingRole: prof?.teaching_role || f.teachingRole,
    }));
    setRows(Array.isArray(mine) ? mine : []);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const submit = async () => {
    if (!user) return;
    if (!form.teachingArea.trim()) { toast.error("Informe a área que você leciona"); return; }
    setBusy(true);
    try {
      let documentPath: string | undefined;
      const file = fileRef.current?.files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo maior que 10 MB");
        const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
        documentPath = `${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("verification-docs").upload(documentPath, file, { upsert: false });
        if (error) throw error;
      }
      await request({ data: { ...form, documentPath } });
      toast.success("Solicitação enviada! Nossa equipe vai analisar.");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e: any) {
      toast.error(e?.message?.includes("já possui") ? "Você já tem uma solicitação em análise" : "Não foi possível enviar a solicitação");
      console.error(e);
    } finally { setBusy(false); }
  };

  if (loading) return <div className="glass rounded-2xl p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const S = STATUS[status] ?? STATUS.nao_verificado;
  const Icon = S.icon;
  const canRequest = status !== "pendente" && status !== "verificado";

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold">Verificação de professor</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Comprove seu vínculo docente para exibir o selo de professor verificado.
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${S.className}`}>
            <Icon className="h-3.5 w-3.5" /> {S.label}
          </span>
        </div>

        {canRequest && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="v-inst">Instituição</Label>
              <Input id="v-inst" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="IFES - Campus Vitória" />
            </div>
            <div>
              <Label htmlFor="v-area">Área que leciona</Label>
              <Input id="v-area" value={form.teachingArea} onChange={(e) => setForm({ ...form, teachingArea: e.target.value })} placeholder="Matemática" />
            </div>
            <div>
              <Label htmlFor="v-role">Cargo (opcional)</Label>
              <Input id="v-role" value={form.teachingRole} onChange={(e) => setForm({ ...form, teachingRole: e.target.value })} placeholder="Professor efetivo" />
            </div>
            <div>
              <Label htmlFor="v-email">E-mail institucional (opcional)</Label>
              <Input id="v-email" type="email" value={form.institutionalEmail} onChange={(e) => setForm({ ...form, institutionalEmail: e.target.value })} placeholder="nome@ifes.edu.br" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="v-doc">Comprovante de vínculo (PDF ou imagem)</Label>
              <Input id="v-doc" ref={fileRef} type="file" accept=".pdf,image/*" />
              <p className="text-[11px] text-muted-foreground mt-1">
                O documento vai para um armazenamento privado e só é visto pela equipe de análise.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Button onClick={submit} disabled={busy} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Enviar solicitação
              </Button>
            </div>
          </div>
        )}

        {status === "pendente" && (
          <p className="mt-4 text-sm text-muted-foreground">
            Sua solicitação está em análise. Você recebe uma notificação assim que houver uma decisão.
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h4 className="font-semibold mb-3 text-sm">Histórico de solicitações</h4>
          <div className="space-y-2">
            {rows.map((r) => {
              const st = STATUS[r.status] ?? STATUS.nao_verificado;
              return (
                <div key={r.id} className="flex items-start justify-between gap-3 text-sm border-b border-border/40 last:border-0 pb-2 last:pb-0">
                  <div>
                    <div className="font-medium">{r.teaching_area} · {r.institution}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} · método: {r.verification_method}
                    </div>
                    {r.rejection_reason && <div className="text-xs text-destructive mt-1">Motivo: {r.rejection_reason}</div>}
                  </div>
                  <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${st.className}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
