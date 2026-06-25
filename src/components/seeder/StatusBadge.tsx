import { cn } from "@/lib/utils";
import type { ScriptStatus } from "@/lib/seeder/types";

const styles: Record<ScriptStatus, string> = {
  rascunho: "bg-muted text-muted-foreground border-border",
  validado: "bg-success/15 text-success border-success/30",
  publicado: "bg-accent/20 text-accent-foreground border-accent/40",
};

const labels: Record<ScriptStatus, string> = {
  rascunho: "Rascunho",
  validado: "Validado",
  publicado: "Publicado",
};

export function StatusBadge({ status }: { status: ScriptStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border font-mono",
        styles[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}
