import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useRunsStats } from "@/lib/seeder/runs-stats";
import { useOrganizations } from "@/lib/seeder/orgs-api";

export function OrgRunStatsCard({ orgId }: { orgId?: string }) {
  const { data: stats, isLoading } = useRunsStats(30);
  const { data: orgs = [] } = useOrganizations();

  const entries = orgId
    ? (stats?.get(orgId) ? [stats.get(orgId)!] : [])
    : [...(stats?.values() ?? [])];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          Execuções (últimos 30 dias)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem execuções registradas no período.
          </p>
        ) : (
          <div className="space-y-5">
            {entries.map((s) => {
              const org = orgs.find((o) => o.id === s.orgId);
              const pct = Math.round(s.successRate * 100);
              return (
                <div key={s.orgId} className="space-y-2">
                  {!orgId && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{org?.sigla ?? s.orgId}</span>
                      <span className="text-xs text-muted-foreground">{s.total} execuções</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Progress value={pct} className="h-2 flex-1" />
                    <span className="text-xs font-mono w-10 text-right">{pct}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-emerald-600" /> {s.ok} ok
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="size-3 text-destructive" /> {s.erro} erros
                    </span>
                    {orgId && <span className="ml-auto">{s.total} execuções</span>}
                  </div>
                  {s.topFails.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Top 3 scripts com falhas
                      </p>
                      <ul className="space-y-1">
                        {s.topFails.map((f) => (
                          <li key={f.scriptId} className="flex items-center justify-between text-xs">
                            <span className="font-mono truncate">{f.nome}</span>
                            <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                              {f.falhas} falha{f.falhas > 1 ? "s" : ""}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
