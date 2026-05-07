import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUBJECTS, MATERIAL_TYPES, DIFFICULTIES } from "@/lib/constants";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";

export const Route = createFileRoute("/upload")({ component: UploadPage });

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional(),
  subject: z.enum(["matematica","portugues","ciencias","geografia","historia","ingles"]),
  type: z.enum(["resumo","flashcards","mapa_mental","lista_exercicios","simulado","outro"]),
  difficulty: z.enum(["facil","medio","dificil"]),
  price: z.number().min(0).max(9999),
});

function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => { if (!authLoading && !user) nav({ to: "/auth" }); }, [authLoading, user, nav]);
  if (!user) return null;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const data = schema.parse({
        title: fd.get("title"),
        description: fd.get("description") || undefined,
        subject: fd.get("subject"),
        type: fd.get("type"),
        difficulty: fd.get("difficulty"),
        price: Number(fd.get("price") || 0),
      });
      setSubmitting(true);
      let file_path: string | null = null;
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g,"_")}`;
        const { error: upErr } = await supabase.storage.from("materials").upload(path, file);
        if (upErr) throw upErr;
        file_path = path;
      }
      const { error } = await supabase.from("materials").insert({
        author_id: user.id,
        title: data.title,
        description: data.description ?? null,
        subject: data.subject,
        type: data.type,
        difficulty: data.difficulty,
        price: data.price,
        file_path,
      });
      if (error) throw error;
      toast.success("Material publicado!");
      nav({ to: "/marketplace" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao publicar");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Publicar material</h1>
        <p className="text-muted-foreground mb-8">Compartilhe seu conteúdo com a comunidade</p>

        <form onSubmit={onSubmit} className="glass-strong rounded-3xl p-6 md:p-8 space-y-5">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input id="title" name="title" required maxLength={120} placeholder="Ex: Resumo de Funções de 2º Grau" />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" maxLength={1000} rows={3} placeholder="O que esse material cobre?" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Matéria *</Label>
              <Select name="subject" required defaultValue="matematica">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s.value} value={s.value}>{s.emoji} {s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select name="type" required defaultValue="resumo">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dificuldade *</Label>
              <Select name="difficulty" required defaultValue="medio">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="price">Preço (R$)</Label>
            <Input id="price" name="price" type="number" min="0" max="9999" step="0.01" defaultValue="0" />
            <p className="text-xs text-muted-foreground mt-1">Use 0 para disponibilizar gratuitamente</p>
          </div>
          <div>
            <Label>Arquivo (PDF, imagem)</Label>
            <label className="mt-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer p-8 text-center transition">
              <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">{file ? file.name : "Clique para enviar"}</span>
              <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow">
            {submitting ? "Publicando..." : "Publicar material"}
          </Button>
        </form>
      </div>
    </div>
  );
}
