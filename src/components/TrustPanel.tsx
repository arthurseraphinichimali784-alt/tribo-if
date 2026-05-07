import { Award, Shield, Sparkles, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { UserStats } from "@/hooks/useUserStats";

export function TrustPanel({ stats }: { stats: UserStats }) {
  const top = stats.specialties.slice(0, 3);
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Trophy className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Nível</div>
            <div className="text-xl font-bold">{stats.level}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
            <Shield className="h-3 w-3 text-primary" /> Trust score
          </div>
          <div className="text-xl font-bold text-gradient">{stats.trust_score.toFixed(1)}</div>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-accent" /> {stats.xp} XP</span>
          <span>{stats.xp % 100}/100</span>
        </div>
        <Progress value={stats.progress_pct} className="h-2" />
      </div>

      {top.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Award className="h-3 w-3 text-warning" /> Especialista em
          </div>
          <div className="flex flex-wrap gap-2">
            {top.map((s) => (
              <span key={s.subject} className="px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
                {s.label} · {s.score}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
