import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useScripts, useDeleteScript } from "@/lib/seeder/scripts-api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/seeder/StatusBadge";
import { ScriptFormDialog } from "@/components/seeder/ScriptFormDialog";
import { ArrowLeft, Download, Copy, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/scripts/$scriptId")({
  head: ({ params }) => ({ meta: [{ title: `${params.scriptId} · SeederLinux` }] }),
  component: ScriptDetail,
});

function ScriptDetail() {
  const { scriptId } = useParams({ from: "/painel/scripts/$scriptId" });
  const { data: scripts = [], isLoading } = useScripts();
  const del = useDeleteScript();
  const nav = useNavigate();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin_gap");
  const s = scripts.find((x) => x.id === scriptId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Carregando…
      </div>
    );
  }

  if (!s) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Script não encontrado.</p>
        <Link to="/painel/scripts" className="text-primary underline text-sm">
          Voltar
        </Link>
      </div>
    );
  }

  const baixar = () => {
    const blob = new Blob([s.conteudo], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = s.nome;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${s.nome} baixado`);
  };

  const handleDelete = async () => {
    if (!confirm(`Excluir definitivamente "${s.nome}"?`)) return;
    try {
      await del.mutateAsync(s.id);
      toast.success("Script excluído");
      nav({ to: "/painel/scripts" });
    } catch (e) {
      toast.error(`Falha: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/painel/scripts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Scripts
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">{s.categoria}</Badge>
            <StatusBadge status={s.status} />
          </div>
          <h1 className="font-mono text-2xl lg:text-3xl font-bold">{s.nome}</h1>
          <p className="text-muted-foreground max-w-2xl">{s.descricao}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <ScriptFormDialog
              script={s}
              trigger={
                <Button variant="outline">
                  <Pencil className="size-4" /> Editar
                </Button>
              }
            />
          )}
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(s.conteudo);
              toast.success("Script copiado");
            }}
          >
            <Copy className="size-4" /> Copiar
          </Button>
          <Button onClick={baixar}>
            <Download className="size-4" /> Baixar
          </Button>
          {isAdmin && (
            <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
              <Trash2 className="size-4" /> Excluir
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide font-mono text-muted-foreground">
              Metadados
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <Meta k="Autor" v={s.autor} />
            <Meta k="Tipo" v={s.oficial ? "Oficial" : "Custom"} />
            <Meta k="Versão" v={`v${s.versao}`} />
            <Meta k="Atualizado" v={s.atualizadoEm} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide font-mono text-muted-foreground">
              Variáveis usadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {s.variaveisUsadas.length === 0 && (
                <span className="text-muted-foreground text-xs">nenhuma</span>
              )}
              {s.variaveisUsadas.map((v) => (
                <Badge key={v} variant="secondary" className="font-mono text-[10px]">{v}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide font-mono text-muted-foreground">
              Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <Meta k="Linhas" v={String(s.conteudo.split("\n").length)} />
            <Meta k="Caracteres" v={String(s.conteudo.length)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-wide font-mono text-muted-foreground">
            Conteúdo bash
          </CardTitle>
          <span className="text-[10px] font-mono text-muted-foreground">
            {s.conteudo.split("\n").length} linhas
          </span>
        </CardHeader>
        <CardContent>
          <div className="terminal-block p-5 text-xs leading-relaxed overflow-auto max-h-[500px]">
            <pre>{s.conteudo}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 pb-1.5 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-right truncate">{v}</span>
    </div>
  );
}
