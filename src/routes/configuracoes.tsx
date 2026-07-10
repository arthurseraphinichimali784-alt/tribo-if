import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, Save, KeyRound, Trash2, Camera, UserCog, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_my_profile")
      .then(({ data }) => { setProfile(Array.isArray(data) ? data[0] : data); setLoading(false); });
  }, [user]);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile) return;
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: String(fd.get("full_name") || "").trim().slice(0, 100) || null,
      username: String(fd.get("username") || "").trim().slice(0, 30),
      bio: String(fd.get("bio") || "").trim().slice(0, 500) || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Esse @ já está em uso" : "Erro ao salvar");
    } else {
      toast.success("Perfil atualizado!");
      setProfile((p: any) => ({ ...p, ...Object.fromEntries(fd) }));
    }
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 2MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Erro no upload"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    setProfile((p: any) => ({ ...p, avatar_url: publicUrl }));
    setUploading(false);
    toast.success("Foto atualizada!");
  };

  const changePassword = async () => {
    if (newPw.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { toast.error(error.message); return; }
    toast.success("Senha alterada!");
    setPwOpen(false);
    setNewPw("");
  };

  const deleteAccount = async () => {
    if (!user) return;
    if (deleteText !== "EXCLUIR") { toast.error("Digite EXCLUIR para confirmar"); return; }
    // Apaga profile (cascade remove materiais, follows, etc.)
    await supabase.from("profiles").delete().eq("id", user.id);
    await signOut();
    toast.success("Conta excluída");
    nav({ to: "/" });
  };

  if (loading) return <div className="min-h-screen"><Header /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-10 max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><UserCog className="h-7 w-7 text-primary" /> Configurações</h1>
          <p className="text-muted-foreground text-sm">Gerencie seu perfil, segurança e preferências</p>
        </div>

        {/* Perfil */}
        <form onSubmit={save} className="glass-strong rounded-3xl p-6 space-y-5">
          <h2 className="font-semibold text-lg">Perfil público</h2>

          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 ring-2 ring-primary/30">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl">
                {(profile?.full_name ?? profile?.username ?? "U").slice(0,2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-sm transition">
                  <Camera className="h-4 w-4" />
                  {uploading ? "Enviando..." : "Trocar foto"}
                </div>
                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
              </label>
              <p className="text-xs text-muted-foreground mt-1">JPG ou PNG, máx 2MB</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Usuário</Label>
              <Input id="username" name="username" defaultValue={profile?.username ?? ""} required maxLength={30} />
            </div>
            <div>
              <Label htmlFor="full_name">Nome</Label>
              <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} maxLength={100} />
            </div>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" defaultValue={profile?.bio ?? ""} maxLength={500} rows={3} placeholder="Conta um pouco sobre você..." />
            <p className="text-xs text-muted-foreground mt-1">{(profile?.bio ?? "").length}/500</p>
          </div>

          <Button type="submit" disabled={saving} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>

        {/* Conta */}
        <div className="glass-strong rounded-3xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Conta</h2>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-medium">Email</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-border/40">
            <div>
              <div className="font-medium">Senha</div>
              <div className="text-sm text-muted-foreground">Altere sua senha sempre que precisar</div>
            </div>
            <Button variant="outline" onClick={() => setPwOpen(true)}>
              <KeyRound className="h-4 w-4 mr-2" /> Alterar senha
            </Button>
          </div>
        </div>

        {/* Zona perigosa */}
        <div className="glass-strong rounded-3xl p-6 space-y-4 border-destructive/30">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <h2 className="font-semibold text-lg">Zona perigosa</h2>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-medium">Excluir conta</div>
              <div className="text-sm text-muted-foreground">Apaga seu perfil, materiais e tudo associado. Irreversível.</div>
            </div>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Excluir conta
            </Button>
          </div>
        </div>
      </div>

      {/* Modal alterar senha */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="glass-strong sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova senha</DialogTitle>
            <DialogDescription>Mínimo 6 caracteres</DialogDescription>
          </DialogHeader>
          <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Nova senha" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPwOpen(false)}>Cancelar</Button>
            <Button onClick={changePassword} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal excluir */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir conta</DialogTitle>
            <DialogDescription>
              Essa ação é permanente. Todos os seus materiais, comentários e histórico serão removidos.
              <br /><br />
              Digite <strong className="text-foreground">EXCLUIR</strong> para confirmar:
            </DialogDescription>
          </DialogHeader>
          <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="EXCLUIR" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setConfirmDelete(false); setDeleteText(""); }}>Cancelar</Button>
            <Button variant="destructive" onClick={deleteAccount} disabled={deleteText !== "EXCLUIR"}>
              Excluir definitivamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
