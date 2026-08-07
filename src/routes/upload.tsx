import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { MaterialCard, type MaterialItem } from "@/components/MaterialCard";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { UploadCloud, FileText, X, Sparkles } from "lucide-react";

export const Route = createFileRoute("/upload")({ component: UploadPage });

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional(),
  subject: z.enum(["matematica","fisica","quimica","biologia","portugues","geografia","historia","ingles"]),
  type: z.enum(["resumo","flashcards","mapa_mental","lista_exercicios","simulado","outro"]),
  difficulty: z.enum(["facil","medio","dificil"]),
  price: z.number().min(0).max(9999),
  topics: z.array(z.string().trim().min(2).max(30)).max(5),
});


function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<string>("matematica");
  const [type, setType] = useState<string>("resumo");
  const [difficulty, setDifficulty] = useState<string>("medio");
  const [price, setPrice] = useState<number>(0);

  useEffect(() => { if (!authLoading && !user) nav({ to: "/auth" }); }, [authLoading, user, nav]);
  if (authLoading || !user) return null;

  const preview: MaterialItem = useMemo(() => ({
    id: "preview",
    title: title || "Título do seu material",
    description: description || "Adicione uma descrição rica para atrair mais cliques.",
    subject, type, difficulty, price,
    downloads: 0, rating: 0,
    cover_url: null, likes: 0, saves_count: 0,
    profiles: { username: "você", avatar_url: null },
  }), [title, description, subject, type, difficulty, price]);

  const handleFiles = (f: File | null) => {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { toast.error("Arquivo maior que 50 MB"); return; }
    setFile(f);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const data = schema.parse({ title, description: description || undefined, subject, type, difficulty, price: Number(price) });
      setSubmitting(true);
      let file_path: string | null = null;
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g,"_")}`;
        const { error: upErr } = await supabase.storage.from("materials").upload(path, file);
        if (upErr) throw upErr;
        file_path = path;
      }
      const { data: inserted, error } = await supabase.from("materials").insert({
        author_id: user.id, title: data.title, description: data.description ?? null,
        subject: data.subject, type: data.type, difficulty: data.difficulty, price: data.price, file_path,
      }).select("id").maybeSingle();
      if (error) { console.error("[upload] insert error", error); throw error; }
      if (inserted) track("material_publish" as any, { entity_type: "material", entity_id: inserted.id, metadata: { subject, type } });
      toast.success("✨ Material publicado! +10 XP");
      if (inserted?.id) nav({ to: "/material/$id", params: { id: inserted.id } });
      else nav({ to: "/marketplace" });
    } catch (err: any) {
      console.error("[upload] erro", err);
      toast.error(err.message ?? "Erro ao publicar");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            Publicar material
          </h1>
          <p className="text-muted-foreground">Veja seu material ganhando vida em tempo real à direita.</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <form onSubmit={onSubmit} className="glass-strong rounded-3xl p-6 md:p-8 space-y-5">
            <div>
              <Label>Arquivo (PDF, imagem — até 50 MB)</Label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files?.[0] ?? null); }}
                className={`mt-1 relative rounded-2xl border-2 border-dashed transition cursor-pointer ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              >
                {file ? (
                  <div className="flex items-center gap-3 p-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    <button type="button" onClick={() => setFile(null)} className="p-2 hover:bg-secondary rounded-lg">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-8 text-center">
                    <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium">Arraste seu arquivo aqui ou clique pra escolher</span>
                    <span className="text-xs text-muted-foreground mt-1">PDF, JPG ou PNG</span>
                    <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => handleFiles(e.target.files?.[0] ?? null)} />
                  </label>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="title">Título *</Label>
              <Input id="title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Resumo de Funções de 2º Grau" />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" maxLength={1000} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que esse material cobre?" />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Matéria *</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUBJECTS.map(s => <SelectItem key={s.value} value={s.value}>{s.emoji} {s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MATERIAL_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dificuldade *</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIFFICULTIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="price">Preço (R$)</Label>
              <Input id="price" type="number" min="0" max="9999" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">{price === 0 ? "🎁 Disponível gratuitamente para a comunidade" : "💰 Material premium"}</p>
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow h-12">
              {submitting ? "Publicando..." : "✨ Publicar e ganhar +10 XP"}
            </Button>
          </form>

          <aside className="lg:sticky lg:top-24 self-start">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Preview ao vivo</div>
            <MaterialCard m={preview} preview />
          </aside>
        </div>
      </div>
    </div>
  );
}
