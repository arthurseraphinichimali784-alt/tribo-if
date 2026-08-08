import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TeacherInfo {
  verification_status?: string | null;
  teaching_area?: string | null;
  institute?: string | null;
  teaching_role?: string | null;
}

/**
 * Selo de professor verificado.
 * Atesta apenas que o vínculo informado foi comprovado — nada além disso.
 */
export function TeacherBadge({ p, className, showDetails = true }: { p?: TeacherInfo | null; className?: string; showDetails?: boolean }) {
  if (!p || p.verification_status !== "verificado") return null;
  const detail = [p.teaching_area && `Professor de ${p.teaching_area}`, p.institute].filter(Boolean).join(" • ");
  return (
    <span className={cn("inline-flex items-center gap-1.5 flex-wrap", className)}>
      <span
        title="Vínculo comprovado pela equipe do StudyHub IF"
        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30"
      >
        <BadgeCheck className="h-3 w-3" /> Professor verificado
      </span>
      {showDetails && detail && <span className="text-[11px] text-muted-foreground">{detail}</span>}
    </span>
  );
}
