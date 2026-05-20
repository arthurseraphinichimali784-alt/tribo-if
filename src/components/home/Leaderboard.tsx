import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { LevelRing } from "@/components/LevelRing";

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard() {
  const { rows, loading } = useLeaderboard(5);
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-4 w-4 text-warning" />
        <h3 className="font-semibold">Top da semana</h3>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-secondary/30 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.id}>
              <Link
                to="/u/$username"
                params={{ username: r.username }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40 transition"
              >
                <span className="w-5 text-center text-sm font-bold">
                  {MEDALS[i] ?? <span className="text-muted-foreground">{i + 1}</span>}
                </span>
                <LevelRing level={r.level} name={r.username} avatarUrl={r.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">@{r.username}</div>
                  <div className="text-[11px] text-muted-foreground">{r.xp} XP</div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
