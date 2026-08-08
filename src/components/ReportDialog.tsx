import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const REASONS = [
  { value: "spam", label: "Spam ou propaganda" },
  { value: "inappropriate", label: "Conteúdo impróprio / ofensivo" },
  { value: "copyright", label: "Violação de direitos autorais" },
  { value: "pirataria", label: "Pirataria / redistribuição do material" },
  { value: "copia", label: "Cópia de material de outra pessoa" },
  { value: "professor_falso", label: "Professor falso / verificação indevida" },
  { value: "wrong_subject", label: "Matéria/categoria errada" },
  { value: "fake", label: "Informação falsa" },
  { value: "other", label: "Outro" },
];

interface Props {
  targetType: "material" | "comment" | "user";
  targetId: string;
  trigger?: React.ReactNode;
}

export function ReportDialog({ targetType, targetId, trigger }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) { toast.error("Faça login para denunciar"); return; }
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: REASONS.find((r) => r.value === reason)?.label ?? reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error("Erro ao enviar denúncia");
      console.error(error);
    } else {
      toast.success("Denúncia enviada. Vamos revisar!");
      setOpen(false);
      setReason("spam");
      setDetails("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button className="text-xs text-muted-foreground hover:text-destructive transition inline-flex items-center gap-1">
            <Flag className="h-3 w-3" /> Denunciar
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" /> Denunciar conteúdo
          </DialogTitle>
          <DialogDescription>
            Suas denúncias são anônimas e ajudam a manter a comunidade saudável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm mb-2 block">Motivo</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {REASONS.map((r) => (
                <label key={r.value} htmlFor={`reason-${r.value}`} className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2 hover:bg-secondary/40 transition">
                  <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="report-details" className="text-sm mb-2 block">Detalhes (opcional)</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
              placeholder="Explique o que está acontecendo..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy} variant="destructive">
            {busy ? "Enviando..." : "Enviar denúncia"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
