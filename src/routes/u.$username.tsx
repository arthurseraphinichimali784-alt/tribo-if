import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialCard, type MaterialItem } from "@/components/MaterialCard";
import { MaterialSkeleton } from "@/components/MaterialSkeleton";
import { StreakFlame } from "@/components/profile/StreakFlame";
import { BadgeGrid } from "@/components/profile/BadgeGrid";
import { LevelRing } from "@/components/LevelRing";
import { TrustRing } from "@/components/TrustRing";
import { XPBar } from "@/components/XPBar";
import { useStreak } from "@/hooks/useStreak";
import { useUserBadges } from "@/hooks/useUserBadges";
import { useFollow } from "@/hooks/useFollow";
import { subjectLabel, SUBJECTS } from "@/lib/constants";
import { Award, Sparkles, Loader2, UserPlus, UserMinus, MapPin, BookOpen } from "lucide-react";

export const Route = createFileRoute("/u/$username")({ component: PublicProfile });

function gradientFor(username: string) {
  const palettes = [
    "from-primary/40 via-accent/30 to-background",
    "from-accent/40 via-tier-diamond/30 to-background",
    "from-warning/40 via-flame/30 to-background",
    "from-tier-gold/40 via-primary/30 to-background",
    "from-tier-diamond/40 via-primary/30 to-background",
  ];
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

function PublicProfile() {
  const { username } = Route.useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [subjects, setSubjects] = useState<{ subject: string; score: number }[]>([]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      setProfile(p);
      if (!p) { setLoading(false); return; }
      const [{ data: mats }, { data: ss }] = await Promise.all([
        supabase.from("materials")
          .select("id,title,description,subject,type,difficulty,price,downloads,rating,cover_url,likes,saves_count")
          .eq("author_id", p.id).eq("published", true)
          .order("created_at", { ascending: false }).limit(48),
        supabase.from("subject_scores").select("subject,score").eq("user_id", p.id).order("score", { ascending: false }).limit(6),
      ]);
      setMaterials((mats ?? []) as any);
      setSubjects((ss ?? []) as any);
      setLoading(false);
    })();
  }, [username]);

  const streak = useStreak(profile?.id);
  const badges = useUserBadges(profile?.id);
  const { following, followers, busy, toggle, isSelf } = useFollow(profile?.id);

  if (loading) return (
    <div className="min-h-screen"><Header />
      <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </div>
  );
  if (!profile) return (
    <div className="min-h-screen"><Header />
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Usuário não encontrado</h1>
        <Link to="/marketplace"><Button>Ir ao marketplace</Button></Link>
      </div>
    </div>
  );

  const xp = profile.xp ?? 0;
  const level = profile.level ?? 1;
  const banner = gradientFor(profile.username);
  const topBadges = badges.slice(0, 3);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Banner */}
      <div className={`relative h-44 md:h-56 bg-gradient-to-br ${banner}`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(1_0_0/0.1),transparent_60%)]" />
      </div>

      <div className="container mx-auto px-4 max-w-6xl">
        {/* Profile header overlapping banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-6 md:p-8 -mt-20 relative z-10 flex flex-col md:flex-row gap-6 items-start"
        >
          <div className="-mt-16">
            <LevelRing level={level} name={profile.full_name ?? profile.username} avatarUrl={profile.avatar_url} size="xl" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{profile.full_name ?? profile.username}</h1>
                <div className="text-muted-foreground text-sm flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                  <span>@{profile.username}</span>
                  {profile.institute && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.institute}{profile.state && `/${profile.state}`}</span>
                  )}
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {materials.length} {materials.length === 1 ? "material" : "materiais"}</span>
                  <span>· <strong className="text-foreground">{followers}</strong> {followers === 1 ? "seguidor" : "seguidores"}</span>
                </div>
                {profile.bio && <p className="mt-3 text-sm whitespace-pre-wrap max-w-2xl">{profile.bio}</p>}
              </div>
              {!isSelf && (
                <Button
                  onClick={toggle}
                  disabled={busy}
                  variant={following ? "outline" : "default"}
                  className={following ? "" : "bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow"}
                >
                  {following ? <><UserMinus className="h-4 w-4 mr-1.5" /> Seguindo</> : <><UserPlus className="h-4 w-4 mr-1.5" /> Seguir</>}
                </Button>
              )}
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <StatCard label="Nível" value={level} accent="from-primary to-primary-glow" />
              <StatCard label="XP" value={xp} accent="from-accent to-primary" />
              <div className="glass rounded-xl p-3 flex items-center gap-3">
                <TrustRing score={Number(profile.trust_score ?? 0)} size={56} />
                <div>
                  <div className="text-xs text-muted-foreground">Trust score</div>
                  <div className="font-semibold text-sm">Reputação</div>
                </div>
              </div>
              <StreakFlame streak={streak} />
            </div>

            <div className="mt-4 max-w-xl">
              <XPBar xp={xp} level={level} />
            </div>

            {topBadges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {topBadges.map((b) => (
                  <span key={b.code} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-tier-gold/20 to-warning/20 border border-tier-gold/30">
                    <Award className="h-3 w-3 text-warning" /> {b.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="materiais" className="mt-8">
          <TabsList className="glass">
            <TabsTrigger value="materiais">Materiais</TabsTrigger>
            <TabsTrigger value="conquistas">Conquistas</TabsTrigger>
            <TabsTrigger value="sobre">Sobre</TabsTrigger>
          </TabsList>

          <TabsContent value="materiais" className="mt-5">
            {materials.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mx-auto mb-3 flex items-center justify-center">
                  <BookOpen className="h-7 w-7 text-primary" />
                </div>
                <div className="font-semibold">Ainda sem materiais publicados</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {materials.map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <MaterialCard m={m} />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="conquistas" className="mt-5 space-y-5">
            <BadgeGrid badges={badges} />
            {subjects.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> Matérias fortes</h3>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => {
                    const emoji = SUBJECTS.find((x) => x.value === s.subject)?.emoji ?? "📚";
                    return (
                      <span key={s.subject} className="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
                        {emoji} {subjectLabel(s.subject)} · {s.score}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sobre" className="mt-5">
            <div className="glass rounded-2xl p-6">
              {profile.bio ? <p className="whitespace-pre-wrap text-sm">{profile.bio}</p> : <p className="text-sm text-muted-foreground">Este usuário ainda não escreveu uma bio.</p>}
              <div className="grid sm:grid-cols-2 gap-3 mt-5">
                {profile.institute && <Field label="Instituto" value={`${profile.institute}${profile.state ? `/${profile.state}` : ""}`} />}
                <Field label="Membro desde" value={new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="h-10" />
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: any; accent: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-medium text-sm mt-0.5">{value}</div>
    </div>
  );
}

// Avoid skeleton lint
void MaterialSkeleton;
