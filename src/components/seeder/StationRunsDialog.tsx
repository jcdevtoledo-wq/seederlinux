import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useStationRuns, type ScriptLogEntry } from "@/lib/seeder/station-runs";
import { CheckCircle2, AlertTriangle, Loader2, History } from "lucide-react";

function ms(n: number) {
  if (n < 1000) return `${n}ms`;
  if (n < 60000) return `${(n / 1000).toFixed(1)}s`;
  return `${Math.floor(n / 60000)}m ${Math.round((n % 60000) / 1000)}s`;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

function ScriptLine({ s }: { s: ScriptLogEntry }) {
  const ok = s.exit_code === 0;
  return (
    <AccordionItem value={`${s.ordem}-${s.id}`}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 w-full text-left">
          {ok ? (
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 text-destructive shrink-0" />
          )}
          <span className="font-mono text-xs text-muted-foreground w-8">#{s.ordem}</span>
          <span className="font-medium text-sm truncate">{s.nome}</span>
          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{ms(s.duracao_ms)}</span>
            <Badge variant="outline" className="text-[10px]">exit {s.exit_code}</Badge>
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2">
          {s.stdout_tail ? (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">stdout (últimos 6 KB)</p>
              <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48">{s.stdout_tail}</pre>
            </div>
          ) : null}
          {s.stderr_tail ? (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-destructive mb-1">stderr</p>
              <pre className="text-xs bg-destructive/5 text-destructive rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48">{s.stderr_tail}</pre>
            </div>
          ) : null}
          {!s.stdout_tail && !s.stderr_tail && (
            <p className="text-xs text-muted-foreground italic">Sem saída capturada.</p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function StationRunsDialog({
  stationId,
  hostname,
  trigger,
}: {
  stationId: string;
  hostname: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { data: runs = [], isLoading } = useStationRuns(open ? stationId : undefined, 20);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            Execuções — <span className="font-mono text-base">{hostname}</span>
          </DialogTitle>
          <DialogDescription>
            Últimas 20 aplicações de perfil reportadas pelo agente.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin mr-2" /> Carregando…
            </div>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhuma execução registrada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {runs.map((r) => {
                const ok = r.status === "ok";
                return (
                  <div
                    key={r.id}
                    className={`rounded-md border p-3 ${ok ? "" : "border-destructive/40 bg-destructive/5"}`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`gap-1 ${ok ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}
                        >
                          {ok ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
                          {ok ? "OK" : "Erro"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{fmt(r.finishedAt)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          serial <span className="font-mono">{r.serialAnterior}</span>
                          {" → "}
                          <span className="font-mono">{r.serialAlvo}</span>
                        </span>
                        <span>
                          scripts <span className="font-mono">{r.scriptsOk}/{r.scriptsTotal}</span>
                        </span>
                        <span className="font-mono">{ms(r.duracaoMs)}</span>
                        {r.agentVersion && (
                          <Badge variant="outline" className="text-[10px]">v{r.agentVersion}</Badge>
                        )}
                      </div>
                    </div>

                    {r.log.length > 0 && (
                      <Accordion type="multiple" className="mt-2">
                        {r.log.map((s) => (
                          <ScriptLine key={`${s.ordem}-${s.id}`} s={s} />
                        ))}
                      </Accordion>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
