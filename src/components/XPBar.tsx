import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function XPBar({ xp, level, compact = false }: { xp: number; level: number; compact?: boolean }) {
  const progress = xp % 100;
  if (compact) {
    return (
      <div className="w-full h-1 bg-secondary/50 overflow-hidden">
        <motion.div
          className="h-full xp-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    );
  }
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-accent" />
          Nível {level}
        </span>
        <span className="font-mono">{progress}/100 XP</span>
      </div>
      <div className="w-full h-2 rounded-full bg-secondary/50 overflow-hidden">
        <motion.div
          className="h-full xp-bar-fill rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
