import { motion } from "framer-motion";
import { Sparkles, Flame, TrendingUp, Upload, Bookmark } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { XPBar } from "@/components/XPBar";
import { useUserStats } from "@/hooks/useUserStats";
import { useStreak } from "@/hooks/useStreak";

export function HeroLogged({ userId, name }: { userId: string; name: string }) {
  const { stats } = useUserStats(userId);
  const streak = useStreak(userId);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const nextLevelXp = 100 - ((stats?.xp ?? 0) % 100);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 pt-6"
    >
      <div className="glass-strong rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">{greet}, @{name} 👋</div>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">
              Faltam <span className="text-gradient">{nextLevelXp} XP</span> pro nível {(stats?.level ?? 1) + 1}
            </h1>
            <div className="max-w-md mb-4"><XPBar xp={stats?.xp ?? 0} level={stats?.level ?? 1} /></div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-flame/10 border border-flame/30 text-sm">
                <Flame className="h-3.5 w-3.5 text-flame animate-flame" />
                <span className="font-semibold">{streak?.current_streak ?? 0} dias</span>
                <span className="text-muted-foreground">de streak</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-sm">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span className="font-semibold">{stats?.xp ?? 0} XP</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold">Trust {Math.round(stats?.trust_score ?? 0)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap md:flex-col">
            <Link to="/upload" className="contents">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow">
                <Upload className="h-4 w-4 mr-1.5" /> Publicar material
              </Button>
            </Link>
            <Link to="/salvos" className="contents">
              <Button size="lg" variant="outline">
                <Bookmark className="h-4 w-4 mr-1.5" /> Meus salvos
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
