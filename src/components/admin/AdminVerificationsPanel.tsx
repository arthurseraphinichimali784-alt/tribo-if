import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listVerifications,
  reviewVerification,
  getVerificationDocUrl,
  getPlatformSettings,
  updatePlatformFee,
} from "@/lib/verification.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X, FileText, Loader2, Percent } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_VARIANT: Record<string, string> = {
  pendente: "bg-warning/15 text-warning border-warning/30",
  verificado: "bg-success/15 text-success border-success/30",
  rejeitado: "bg-destructive/15 text-destructive border-destructive/30",
};

export function AdminVerificationsPanel() {
  const qc = useQueryClient();
  const list = useServerFn(listVerifications);
  const review = useServerFn(reviewVerification);
  const docUrl = useServerFn(getVerificationDocUrl);
  const [filter, setFilter] = useState<"pendente" | "todas">("pendente");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-verifications", filter],
    queryFn: () => list({ data: { status: filter } }),
  });

  const act = async (id: string, approve: boolean) => {
    if (!approve && !(reasons[id] ?? "").trim()) { toast.error("Informe o motivo da rejeição"); return; }
    setBusyId(id);
    try {
      await review({ data: { verificationId: id, approve, reason: reasons[id] } });
      toast.success(approve ? "Professor verificado" : "Solicitação rejeitada");
      await qc.invalidateQueries({ queryKey: ["admin-verifications"] });
    } catch { toast.error("Falha ao processar"); }
    setBusyId(null);
  };

  const openDoc = async (id: string) => {
    try {
      const { url } = await docUrl({ data: { verificationId: id } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch { toast.error("Documento indisponível"); }
  };

  return (
    <div className="space-y-4">
      <PlatformFeeCard />

      <div className="flex gap-2">
        <Button size="sm" variant={filter === "pendente" ? "default" : "outline"} onClick={() => setFilter("pendente")}>Pendentes</Button>
        <Button size="sm" variant={filter === "todas" ? "default" : "outline"} onClick={() => setFilter("todas")}>Todas</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !data?.length ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">Nenhuma solicitação {filter === "pendente" ? "pendente" : ""}.</div>
      ) : (
        <div className="space-y-3">
          {data.map((v: any) => (
            <div key={v.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">
                    {v.profile?.full_name ?? v.profile?.username ?? "Usuário"}{" "}
                    <span className="text-xs text-muted-foreground">@{v.profile?.username}</span>
                  </div>
                  <div className="text-sm mt-1">{v.teaching_area} · {v.institution}{v.teaching_role ? ` · ${v.teaching_role}` : ""}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {v.institutional_email ? `${v.institutional_email} · ` : ""}método: {v.verification_method} ·{" "}
                    {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: ptBR })}
                  </div>
                  {v.rejection_reason && <div className="text-xs text-destructive mt-1">Motivo: {v.rejection_reason}</div>}
                </div>
                <Badge className={STATUS_VARIANT[v.status] ?? ""} variant="outline">{v.status}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {v.document_path && (
                  <Button size="sm" variant="outline" onClick={() => openDoc(v.id)}>
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> Ver documento
                  </Button>
                )}
                {v.status === "pendente" && (
                  <>
                    <Input
                      value={reasons[v.id] ?? ""}
                      onChange={(e) => setReasons({ ...reasons, [v.id]: e.target.value })}
                      placeholder="Motivo (obrigatório ao rejeitar)"
                      className="h-9 max-w-xs"
                    />
                    <Button size="sm" disabled={busyId === v.id} onClick={() => act(v.id, true)} className="bg-success text-background hover:bg-success/90">
                      <Check className="h-3.5 w-3.5 mr-1.5" /> Aprovar
                    </Button>
                    <Button size="sm" variant="destructive" disabled={busyId === v.id} onClick={() => act(v.id, false)}>
                      <X className="h-3.5 w-3.5 mr-1.5" /> Rejeitar
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlatformFeeCard() {
  const getSettings = useServerFn(getPlatformSettings);
  const updateFee = useServerFn(updatePlatformFee);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["platform-settings"], queryFn: () => getSettings() });
  const [value, setValue] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const current = Number((data as any)?.platform_fee_percent ?? 5);

  const save = async () => {
    setBusy(true);
    try {
      await updateFee({ data: { feePercent: Number(value) } });
      toast.success("Taxa da plataforma atualizada");
      await qc.invalidateQueries({ queryKey: ["platform-settings"] });
      setValue("");
    } catch { toast.error("Percentual inválido"); }
    setBusy(false);
  };

  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3 flex-wrap">
      <Percent className="h-4 w-4 text-primary" />
      <div className="text-sm">
        Taxa da plataforma atual: <strong>{current}%</strong>
        <span className="text-muted-foreground"> (aplicada no momento da compra)</span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <Input type="number" min={0} max={100} step="0.5" value={value} onChange={(e) => setValue(e.target.value)} placeholder={String(current)} className="h-9 w-24" />
        <Button size="sm" variant="outline" disabled={busy || value === ""} onClick={save}>Salvar</Button>
      </div>
    </div>
  );
}
