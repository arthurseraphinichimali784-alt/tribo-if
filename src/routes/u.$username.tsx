import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { MaterialCard, type MaterialItem } from "@/components/MaterialCard";
import { MaterialSkeleton } from "@/components/MaterialSkeleton";
import { StreakFlame } from "@/components/profile/StreakFlame";
import { BadgeGrid } from "@/components/profile/BadgeGrid";
import { useStreak } from "@/hooks/useStreak";
import { useUserBadges } from "@/hooks/useUserBadges";
import { subjectLabel } from "@/lib/constants";
import { Award, Shield, Sparkles, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/u/$username")({ component: PublicProfile });

function PublicProfile() {
  const { username } = Route.useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [popular, setPopular] = useState<MaterialItem[]>([]);
  const [subjects, setSubjects] = useState<{ subject: string; score: number }[]>([]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      setProfile(p);
      if (!p) { setLoading(false); return; }
      const [{ data: mats }, { data: pop }, { data: ss }] = await Promise.all([
        supabase.from("materials")
          .select("id,title,description,subject,type,difficulty,price,downloads,rating,cover_url,likes,saves_count")
          .eq("author_id", p.id).eq("published", true)
          .order("created_at", { ascending: false }).limit(24),
        supabase.from("materials")
          .select("id,title,description,subject,type,difficulty,price,downloads,rating,cover_url,likes,saves_count")
          .eq("author_id", p.id).eq("published", true)
          .order("likes", { ascending: false }).limit(6),
        supabase.from("subject_scores").select("subject,score").eq("user_id", p.id).order("score", { ascending: false }).limit(6),
      ]);
      setMaterials((mats ?? []) as any);
      setPopular((pop ?? []) as any);
      setSubjects((ss ?? []) as any);
      setLoading(false);
    })();
  }, [username]);

  const streak = useStreak(profile?.id);
  const badges = useUserBadges(profile?.id);

  if (loading) return <div className="min-h-screen"><Header /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>;
  if (!profile) return (
    <div className="min-h-screen"><Header /><div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">Usuário não encontrado</h1>
      <Link to="/marketplace"><Button>Ir ao marketplace</Button></Link>
    </div></div>
  );

  const xp = profile.xp ?? 0;
  const progress = (xp % 100);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        {/* Header */}
        <div className="glass-strong rounded-3xl p-6 md:p-8 mb-6 flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="h-24 w-24 ring-4 ring-primary/30">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-3xl font-bold">
              {(profile.full_name ?? profile.username).slice(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{profile.full_name ?? profile.username}</h1>
            <p className="text-muted-foreground">@{profile.username}{profile.institute && ` · ${profile.institute}`}{profile.state && `/${profile.state}`}</p>
            {profile.bio && <p className="mt-3 text-sm whitespace-pre-wrap">{profile.bio}</p>}
            <div className="grid grid-cols-3 gap-3 mt-5 max-w-md">
              <Stat icon={Trophy} label="Nível" value={profile.level} />
              <Stat icon={Shield} label="Trust" value={Number(profile.trust_score).toFixed(0)} />
              <Stat icon={Sparkles} label="XP" value={xp} />
            </div>
          </div>
        </div>

        {/* XP bar + streak */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 glass rounded-2xl p-5">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-accent" /> Progresso para o nível {profile.level + 1}</span>
              <span>{progress}/100 XP</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <StreakFlame streak={streak} />
        </div>

        {/* Subjects + badges */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Award className="h-4 w-4 text-warning" /> Matérias fortes</h3>
            {subjects.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados ainda.</p> : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <span key={s.subject} className="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
                    {subjectLabel(s.subject)} · {s.score}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3">Conquistas</h3>
            <BadgeGrid badges={badges} />
          </div>
        </div>

        {/* Popular */}
        {popular.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Materiais populares</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {popular.map((m) => <MaterialCard key={m.id} m={m} />)}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-bold mb-4">Todos os materiais ({materials.length})</h2>
          {materials.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => <MaterialSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {materials.map((m) => <MaterialCard key={m.id} m={m} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
