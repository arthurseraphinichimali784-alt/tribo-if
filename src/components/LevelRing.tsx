import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function tierClass(level: number) {
  if (level >= 21) return "from-tier-diamond to-accent";
  if (level >= 11) return "from-tier-gold to-warning";
  if (level >= 6) return "from-primary to-primary-glow";
  if (level >= 2) return "from-tier-silver to-muted-foreground";
  return "from-tier-bronze to-warning";
}

export function LevelRing({
  level,
  name,
  avatarUrl,
  size = "md",
}: {
  level: number;
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: { box: "h-10 w-10", inner: "h-9 w-9", badge: "text-[9px] px-1.5 py-0", fall: "text-xs" },
    md: { box: "h-14 w-14", inner: "h-[3.1rem] w-[3.1rem]", badge: "text-[10px] px-2 py-0.5", fall: "text-sm" },
    lg: { box: "h-20 w-20", inner: "h-[4.5rem] w-[4.5rem]", badge: "text-xs px-2 py-0.5", fall: "text-xl" },
    xl: { box: "h-28 w-28", inner: "h-[6.3rem] w-[6.3rem]", badge: "text-sm px-2.5 py-1", fall: "text-3xl" },
  }[size];

  return (
    <div className="relative inline-block">
      <div className={cn("rounded-full bg-gradient-to-br p-[2.5px]", tierClass(level), sizes.box)}>
        <Avatar className={cn(sizes.inner, "ring-2 ring-background")}>
          <AvatarImage src={avatarUrl ?? undefined} />
          <AvatarFallback className={cn("bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold", sizes.fall)}>
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
      <div
        className={cn(
          "absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full font-bold text-primary-foreground bg-gradient-to-r shadow-md",
          tierClass(level),
          sizes.badge,
        )}
      >
        {level}
      </div>
    </div>
  );
}
