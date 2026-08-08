import { cn } from "@/lib/utils";
import { typeEmoji, typeLabel, difficultyEmoji, difficultyLabel, levelLabel } from "@/lib/constants";

/** Flair do tipo de conteúdo — visual, fácil de identificar. */
export function ContentTypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary",
        className,
      )}
    >
      <span aria-hidden>{typeEmoji(type)}</span>
      {typeLabel(type)}
    </span>
  );
}

export function KitBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent",
        className,
      )}
    >
      📦 Kit
    </span>
  );
}

export function DifficultyBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] text-muted-foreground", className)}>
      <span aria-hidden>{difficultyEmoji(value)}</span>
      {difficultyLabel(value)}
    </span>
  );
}

export function LevelBadge({ value, className }: { value?: string | null; className?: string }) {
  const label = levelLabel(value);
  if (!label) return null;
  return (
    <span className={cn("inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground", className)}>
      {label}
    </span>
  );
}

/** Chips de tags/assuntos. */
export function TagChips({
  tags,
  max = 4,
  className,
  onSelect,
}: {
  tags?: string[] | null;
  max?: number;
  className?: string;
  onSelect?: (tag: string) => void;
}) {
  const list = (tags ?? []).filter(Boolean);
  if (list.length === 0) return null;
  const shown = list.slice(0, max);
  const rest = list.length - shown.length;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {shown.map((t) => (
        <button
          key={t}
          type="button"
          disabled={!onSelect}
          onClick={onSelect ? () => onSelect(t) : undefined}
          className={cn(
            "rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border/40",
            onSelect && "hover:border-primary/50 hover:text-primary transition",
          )}
        >
          #{t}
        </button>
      ))}
      {rest > 0 && <span className="text-[10px] text-muted-foreground">+{rest}</span>}
    </div>
  );
}
