import { Award, Flame, Heart, Upload } from "lucide-react";
import type { BadgeRow } from "@/hooks/useUserBadges";

const ICONS: Record<string, any> = { award: Award, flame: Flame, heart: Heart, upload: Upload };

export function BadgeGrid({ badges }: { badges: BadgeRow[] }) {
  if (!badges.length) return (
    <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
      Nenhuma conquista ainda. Publique materiais e mantenha sua sequência diária!
    </div>
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {badges.map((b) => {
        const Icon = ICONS[b.icon ?? "award"] ?? Award;
        return (
          <div key={b.code} className="glass rounded-2xl p-4 text-center hover:border-primary/40 transition">
            <div className="h-12 w-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="font-semibold text-sm">{b.label}</div>
            {b.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{b.description}</div>}
          </div>
        );
      })}
    </div>
  );
}
