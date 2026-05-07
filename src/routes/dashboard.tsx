import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUserStats } from "@/hooks/useUserStats";
import { Header } from "@/components/Header";
import { TrustPanel } from "@/components/TrustPanel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MaterialCard, type MaterialItem } from "@/components/MaterialCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!authLoading && !user) nav({ to: "/auth" }); }, [authLoading, user, nav]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("materials").select("id,title,description,subject,type,difficulty,price,downloads,rating,cover_url,likes").eq("author_id", user.id).order("created_at", { ascending: false }),
    ]).then(([p, m]) => {
      if (p.error) console.error("[dashboard] profile", p.error);
      if (m.error) console.error("[dashboard] materials", m.error);
      setProfile(p.data);
      setMaterials((m.data ?? []) as any);
      setLoading(false);
    });
  }, [user]);

  const { stats } = useUserStats(user?.id);

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: String(fd.get("full_name") || "").slice(0,100),
      bio: String(fd.get("bio") || "").slice(0,500),
      institute: String(fd.get("institute") || "").slice(0,50),
      state: String(fd.get("state") || "").slice(0,2),
      hourly_rate: fd.get("hourly_rate") ? Number(fd.get("hourly_rate")) : null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Perfil atualizado!"); setProfile({...profile, ...Object.fromEntries(fd)}); }
  };

  if (loading || !user) return (
    <div className="min-h-screen"><Header /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>
  );

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <div className="glass-strong rounded-3xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-start md:items-center gap-5">
          <Avatar className="h-20 w-20 ring-2 ring-primary/40">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl font-bold">
              {(profile?.full_name ?? profile?.username ?? "U").slice(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile?.full_name ?? profile?.username}</h1>
            <p className="text-muted-foreground">@{profile?.username} {profile?.is_teacher && <span className="ml-2 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs">Tutor</span>}</p>
          </div>
          <Link to="/upload"><Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow"><Plus className="h-4 w-4 mr-1" /> Novo material</Button></Link>
        </div>

        {stats && <div className="mb-8"><TrustPanel stats={stats} /></div>}

        <Tabs defaultValue="materials">
          <TabsList>
            <TabsTrigger value="materials">Meus materiais ({materials.length})</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="materials" className="mt-6">
            {materials.length === 0 ? (
              <div className="glass rounded-2xl p-16 text-center">
                <div className="text-6xl mb-4">📤</div>
                <h3 className="text-xl font-semibold mb-2">Você ainda não publicou nada</h3>
                <Link to="/upload"><Button className="mt-4">Publicar primeiro material</Button></Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {materials.map((m) => <MaterialCard key={m.id} m={m} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <form onSubmit={saveProfile} className="glass-strong rounded-3xl p-6 md:p-8 space-y-4 max-w-2xl">
              <div>
                <Label htmlFor="full_name">Nome completo</Label>
                <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} maxLength={100} />
              </div>
              <div>
                <Label htmlFor="bio">Biografia</Label>
                <Textarea id="bio" name="bio" defaultValue={profile?.bio ?? ""} maxLength={500} rows={3} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="institute">Instituto</Label>
                  <Input id="institute" name="institute" defaultValue={profile?.institute ?? ""} placeholder="IFES, IFSP..." maxLength={50} />
                </div>
                <div>
                  <Label htmlFor="state">UF</Label>
                  <Input id="state" name="state" defaultValue={profile?.state ?? ""} maxLength={2} placeholder="ES" />
                </div>
              </div>
              {profile?.is_teacher && (
                <div>
                  <Label htmlFor="hourly_rate">Valor/hora (R$)</Label>
                  <Input id="hourly_rate" name="hourly_rate" type="number" min="0" step="0.01" defaultValue={profile?.hourly_rate ?? ""} />
                </div>
              )}
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
