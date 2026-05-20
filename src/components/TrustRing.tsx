import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export function TrustRing({ score, size = 80 }: { score: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color =
    pct >= 75 ? "var(--color-primary)" : pct >= 40 ? "var(--color-warning)" : "var(--color-destructive)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth={4} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Shield className="h-3 w-3 text-muted-foreground" />
        <span className="font-bold text-sm leading-none mt-0.5">{Math.round(pct)}</span>
      </div>
    </div>
  );
}
