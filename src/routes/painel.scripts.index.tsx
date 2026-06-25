import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useScripts } from "@/lib/seeder/scripts-api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/seeder/StatusBadge";
import { ScriptFormDialog } from "@/components/seeder/ScriptFormDialog";
import { Search, Plus, FileCode2, Loader2 } from "lucide-react";
import type { ScriptCategory } from "@/lib/seeder/types";

export const Route = createFileRoute("/painel/scripts/")({
  head: () => ({ meta: [{ title: "Scripts · SeederLinux" }] }),
  component: ScriptsPage,
});

const CATEGORIAS: { id: "todos" | ScriptCategory; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "ingresso", label: "Ingresso" },
  { id: "personalizacao", label: "Personalização" },
  { id: "logon", label: "Logon" },
  { id: "logoff", label: "Logoff" },
  { id: "atualizacao", label: "Atualização" },
  { id: "senha", label: "Senha" },
  { id: "impressoras", label: "Impressoras" },
  { id: "legados", label: "Legados" },
  { id: "inventario", label: "Inventário" },
];

function ScriptsPage() {
  const { data: scripts = [], isLoading } = useScripts();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"todos" | ScriptCategory>("todos");

  const filtered = scripts.filter((s) => {
    const matchQ =
      s.nome.toLowerCase().includes(q.toLowerCase()) ||
      s.descricao.toLowerCase().includes(q.toLowerCase());
    const matchC = cat === "todos" || s.categoria === cat;
    return matchQ && matchC;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
            Catálogo
          </p>
          <h1 className="text-3xl font-bold mt-1">Scripts</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie, versione e publique scripts shell do ecossistema software livre.
          </p>
        </div>
        <ScriptFormDialog
          trigger={
            <Button>
              <Plus className="size-4" /> Novo script
            </Button>
          }
        />
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou descrição…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIAS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              cat === c.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-muted border-border text-muted-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Carregando scripts…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <Link key={s.id} to="/painel/scripts/$scriptId" params={{ scriptId: s.id }}>
              <Card className="h-full hover:shadow-elegant hover:border-primary/50 transition-all cursor-pointer">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="size-10 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
                      <FileCode2 className="size-5" />
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <div>
                    <div className="font-mono font-semibold text-sm truncate">{s.nome}</div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{s.descricao}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                    <Badge variant="outline" className="font-mono text-[10px]">{s.categoria}</Badge>
                    <Badge variant="secondary" className="font-mono text-[10px]">v{s.versao}</Badge>
                    <Badge variant={s.oficial ? "default" : "outline"} className="font-mono text-[10px]">
                      {s.oficial ? "oficial" : "custom"}
                    </Badge>
                    {s.variaveisUsadas.length > 0 && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {s.variaveisUsadas.length} vars
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">
          Nenhum script ainda. Clique em <strong>Novo script</strong> para criar o primeiro.
        </p>
      )}
    </div>
  );
}
