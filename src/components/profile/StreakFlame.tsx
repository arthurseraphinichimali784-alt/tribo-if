import { Flame } from "lucide-react";
import type { Streak } from "@/hooks/useStreak";

export function StreakFlame({ streak }: { streak: Streak | null }) {
  const cur = streak?.current_streak ?? 0;
  const longest = streak?.longest_streak ?? 0;
  const active = cur > 0;
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-3">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${active ? "bg-gradient-to-br from-warning to-destructive" : "bg-muted"}`}>
        <Flame className={`h-6 w-6 ${active ? "text-primary-foreground animate-pulse" : "text-muted-foreground"}`} />
      </div>
      <div>
        <div className="text-2xl font-bold">{cur} {cur === 1 ? "dia" : "dias"}</div>
        <div className="text-xs text-muted-foreground">Recorde: {longest}</div>
      </div>
    </div>
  );
}
