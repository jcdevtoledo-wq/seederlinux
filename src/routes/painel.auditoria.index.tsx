import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Search, Download, Loader2, Lock } from "lucide-react";
import { useAuditLog, type AuditCategory } from "@/lib/seeder/audit";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/painel/auditoria/")({
  head: () => ({ meta: [{ title: "Auditoria · SeederLinux" }] }),
  component: AuditoriaPage,
});

const CAT_COLORS: Record<AuditCategory, string> = {
  bundle: "bg-primary/10 text-primary border-primary/30",
  script: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  organizacao: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  variavel: "bg-violet-500/10 text-violet-700 border-violet-500/30",
  perfil: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  hub: "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/30",
  config: "bg-muted text-muted-foreground border-border",
  estacao: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

function AuditoriaPage() {
  const { hasRole } = useAuth();
  const canRead = hasRole("admin_gap") || hasRole("auditor");
  const { data: log = [], isLoading, error } = useAuditLog();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const filtered = useMemo(() => {
    return log.filter((e) => {
      if (cat !== "all" && e.categoria !== cat) return false;
      if (q && !`${e.acao} ${e.alvo ?? ""} ${e.detalhes ?? ""} ${e.ator}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [log, q, cat]);

  const exportar = () => {
    const header = "timestamp,ator,categoria,acao,alvo,detalhes\n";
    const rows = filtered
      .map((e) => [e.ts, e.ator, e.categoria, e.acao, e.alvo ?? "", (e.detalhes ?? "").replace(/,/g, ";")].join(","))
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">Trilha</p>
          <h1 className="text-3xl font-bold mt-1">Auditoria</h1>
          <p className="text-muted-foreground mt-1">
            Quem alterou o quê e quando — eventos institucionais do SeederLinux.
          </p>
        </div>
        <Button variant="outline" onClick={exportar} disabled={!canRead || filtered.length === 0}>
          <Download className="size-4" /> CSV
        </Button>
      </div>

      {!canRead ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Lock className="size-6 mx-auto mb-3 opacity-60" />
            Acesso restrito a administradores GAP e auditores.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="size-4 text-primary" /> Eventos ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ator, ação, alvo..." className="pl-9" />
              </div>
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  <SelectItem value="bundle">Bundle</SelectItem>
                  <SelectItem value="script">Script</SelectItem>
                  <SelectItem value="organizacao">Organização</SelectItem>
                  <SelectItem value="variavel">Variável</SelectItem>
                  <SelectItem value="perfil">Perfil</SelectItem>
                  <SelectItem value="hub">Hub</SelectItem>
                  <SelectItem value="config">Config</SelectItem>
                  <SelectItem value="estacao">Estação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-5 animate-spin mr-2" /> Carregando trilha…
              </div>
            ) : error ? (
              <p className="text-sm text-destructive py-6">Erro: {(error as Error).message}</p>
            ) : (
              <ol className="relative border-l border-border pl-6 space-y-4">
                {filtered.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[31px] top-1.5 size-3 rounded-full bg-primary ring-4 ring-background" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] uppercase ${CAT_COLORS[e.categoria]}`}>
                        {e.categoria}
                      </Badge>
                      <span className="font-medium text-sm">{e.acao}</span>
                      {e.alvo && <span className="font-mono text-xs text-muted-foreground">→ {e.alvo}</span>}
                    </div>
                    {e.detalhes && <p className="text-xs text-muted-foreground mt-1">{e.detalhes}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                      {fmt(e.ts)} · {e.ator}
                    </p>
                  </li>
                ))}
                {!filtered.length && (
                  <li className="text-sm text-muted-foreground py-6">Nenhum evento corresponde aos filtros.</li>
                )}
              </ol>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
