import { createFileRoute } from "@tanstack/react-router";
import { useVariables } from "@/lib/seeder/variables-api";
import { useScripts } from "@/lib/seeder/scripts-api";
import { useOrganizations } from "@/lib/seeder/orgs-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Variable, CheckCircle2, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VariableFormDialog } from "@/components/seeder/VariableFormDialog";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/painel/variaveis/")({
  head: () => ({ meta: [{ title: "Variáveis · SeederLinux" }] }),
  component: VariaveisPage,
});

function VariaveisPage() {
  const { data: variables = [], isLoading } = useVariables();
  const { data: scripts = [] } = useScripts();
  const { data: organizations = [] } = useOrganizations();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin_gap");

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
            Catálogo
          </p>
          <h1 className="text-3xl font-bold mt-1 flex items-center gap-3">
            <Variable className="size-7 text-primary" /> Variáveis
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Os scripts oficiais são <strong>imutáveis</strong> — eles leem estas variáveis do{" "}
            <code className="font-mono text-xs">.conf</code> de cada OM.
          </p>
        </div>
        {isAdmin && (
          <VariableFormDialog
            trigger={<Button><Plus className="size-4" /> Nova variável</Button>}
          />
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Carregando catálogo…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {variables.map((v) => {
            const usadoPor = scripts.filter((s) => s.variaveisUsadas.includes(v.key));
            const omsComValor = organizations.filter((o) => !!o.variaveis[v.key]);
            const cobertura = organizations.length > 0
              ? Math.round((omsComValor.length / organizations.length) * 100)
              : 0;
            return (
              <Card key={v.key} className="hover:shadow-elegant transition-all">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">{v.key}</span>
                        <Badge variant={v.oficial ? "default" : "outline"} className="text-[10px]">
                          {v.oficial ? "oficial" : "custom"}
                        </Badge>
                        {v.obrigatoria && (
                          <Badge variant="destructive" className="text-[10px]">obrigatória</Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium mt-0.5">{v.label}</div>
                      <p className="text-xs text-muted-foreground mt-1">{v.descricao}</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                      {v.escopo}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                    <div>
                      <div className="text-muted-foreground mb-0.5">Usada por</div>
                      <div className="font-mono font-semibold">
                        {usadoPor.length} script{usadoPor.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-0.5">Cobertura OMs</div>
                      <div className="flex items-center gap-1.5">
                        {cobertura === 100 ? (
                          <CheckCircle2 className="size-3.5 text-success" />
                        ) : cobertura === 0 ? (
                          <AlertTriangle className="size-3.5 text-destructive" />
                        ) : (
                          <AlertTriangle className="size-3.5 text-warning" />
                        )}
                        <span className="font-mono font-semibold">{cobertura}%</span>
                        <span className="text-muted-foreground">
                          ({omsComValor.length}/{organizations.length})
                        </span>
                      </div>
                    </div>
                  </div>

                  {(v.exemplo || v.default) && (
                    <div className="text-[11px] font-mono text-muted-foreground bg-muted/40 rounded px-2 py-1">
                      {v.default ? `default: ${v.default}` : `ex: ${v.exemplo}`}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
