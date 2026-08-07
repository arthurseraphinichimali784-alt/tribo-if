import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Trophy, Flame, TrendingUp } from "lucide-react";
import { LevelRing } from "@/components/LevelRing";
import { getLeaderboard, type LeaderEntry } from "@/lib/leaderboard.functions";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard() {
  const [period, setPeriod] = useState<"week" | "all">("week");
  const fetchBoard = useServerFn(getLeaderboard);
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => fetchBoard({ data: { period, limit: 8 } }) as Promise<LeaderEntry[]>,
    staleTime: 60_000,
  });

  const rows = data ?? [];

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          <h3 className="font-semibold">Ranking</h3>
        </div>
        <div className="flex rounded-lg bg-secondary/50 p-0.5 text-[11px] font-medium">
          {([["week", "Semana"], ["all", "Geral"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setPeriod(v)}
              className={cn(
                "px-2.5 py-1 rounded-md transition",
                period === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 rounded-lg bg-secondary/30 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-2xl mb-1">🏆</div>
          <p className="text-sm text-muted-foreground">Ninguém pontuou ainda esta semana.</p>
          <p className="text-xs text-muted-foreground mt-1">Publique um material e assuma o topo.</p>
        </div>
      ) : (
        <ol className="space-y-1">
          {rows.map((r, i) => {
            const me = user?.id === r.id;
            return (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to="/u/$username"
                  params={{ username: r.username }}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-xl transition",
                    me ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-secondary/40",
                  )}
                >
                  <span className="w-5 text-center text-sm font-bold shrink-0">
                    {MEDALS[i] ?? <span className="text-muted-foreground">{i + 1}</span>}
                  </span>
                  <LevelRing level={r.level} name={r.username} avatarUrl={r.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      @{r.username}
                      {me && <span className="text-[9px] uppercase tracking-wide bg-primary/20 text-primary px-1.5 py-0.5 rounded">você</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>Nv. {r.level}</span>
                      <span>·</span>
                      <span>{r.xp} XP</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-primary flex items-center gap-1">
                      {period === "week" ? <Flame className="h-3 w-3 text-orange-400" /> : <TrendingUp className="h-3 w-3" />}
                      {period === "week" ? `+${r.score}` : r.score}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{period === "week" ? "pts" : "XP"}</div>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </ol>
      )}

      <p className="text-[10px] text-muted-foreground mt-3 leading-snug">
        {period === "week"
          ? "Pontos da semana: +3 por like recebido, +10 por material publicado."
          : "Ranking geral por XP acumulado desde sempre."}
      </p>
    </div>
  );
}
