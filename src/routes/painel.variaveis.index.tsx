import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useOrganizations } from "@/lib/seeder/orgs-api";
import { useBulkUpdateVariables, useVariables } from "@/lib/seeder/variables-api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Variable,
  Loader as Loader2,
  Tag,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import type { VariableDefinition } from "@/lib/seeder/types";

export const Route = createFileRoute("/painel/variaveis/")({
  head: () => ({ meta: [{ title: "Variáveis - SeederLinux" }] }),
  component: VariablesPage,
});

function VariablesPage() {
  const { data: orgs = [], isLoading: orgsLoading } = useOrganizations();
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("todos");
  const [showOnlyRequired, setShowOnlyRequired] = useState(false);
  const [showOnlyWithValue, setShowOnlyWithValue] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const { data: variables = [], isLoading: varsLoading } = useVariables(selectedOrgId);
  const bulkUpdate = useBulkUpdateVariables();

  const isLoading = orgsLoading || varsLoading;

  // Determina valor atual: edição em curso > valor salvo > default
  const currentValue = (v: VariableDefinition): string =>
    edits[v.key] ?? v.value ?? "";

  const filtered = useMemo(() => {
    return variables.filter((v) => {
      const text = q.toLowerCase();
      const matchQ =
        !text ||
        v.key.toLowerCase().includes(text) ||
        v.label.toLowerCase().includes(text) ||
        v.description.toLowerCase().includes(text);
      const matchCat = catFilter === "todos" || v.category === catFilter;
      const matchRequired = !showOnlyRequired || v.required;
      const matchValue = !showOnlyWithValue || (currentValue(v) && currentValue(v).trim() !== "");
      return matchQ && matchCat && matchRequired && matchValue;
    });
  }, [variables, q, catFilter, showOnlyRequired, showOnlyWithValue, edits]);

  const grouped = useMemo(() => {
    const m = new Map<string, VariableDefinition[]>();
    for (const v of filtered) {
      if (!m.has(v.category)) m.set(v.category, []);
      m.get(v.category)!.push(v);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const categories = useMemo(() => {
    const set = new Set<string>(variables.map((v) => v.category));
    return [
      { id: "todos", label: "Todas as categorias" },
      ...[...set].sort().map((c) => ({ id: c, label: c })),
    ];
  }, [variables]);

  const dirty = Object.keys(edits).length > 0;

  const handleSave = async () => {
    if (!selectedOrgId || !dirty) return;
    try {
      const result = await bulkUpdate.mutateAsync({
        orgId: selectedOrgId,
        variables: edits,
      });
      toast.success(
        `${result.updated} variável(is) atualizada(s) — novo serial ${result.serial}`
      );
      setEdits({});
    } catch (e) {
      toast.error(`Falha ao salvar: ${(e as Error).message}`);
    }
  };

  if (orgs.length === 0 && !orgsLoading) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
          Nenhuma OM configurada. Crie uma organização primeiro para gerenciar suas variáveis.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="variables-page">
      <Header />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger className="w-72" data-testid="variables-org-select">
              <SelectValue placeholder="Selecione uma OM para editar valores" />
            </SelectTrigger>
            <SelectContent>
              {orgs.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.sigla} — {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedOrgId && (
            <Badge variant="outline" className="font-mono text-[10px]" data-testid="variables-count">
              {variables.length} variáveis catalogadas
            </Badge>
          )}
        </div>
        {dirty && selectedOrgId && (
          <Button onClick={handleSave} disabled={bulkUpdate.isPending} data-testid="variables-save-btn">
            {bulkUpdate.isPending ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <Save className="size-4 mr-1.5" />
            )}
            Salvar ({Object.keys(edits).length})
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="variables-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por chave, label ou descrição..."
            className="pl-9"
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-56" data-testid="variables-category-select">
            <Tag className="size-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showOnlyRequired ? "default" : "outline"}
          size="sm"
          onClick={() => setShowOnlyRequired(!showOnlyRequired)}
          className="h-9"
          data-testid="variables-filter-required"
        >
          <AlertCircle className="size-3.5 mr-1.5" />
          Obrigatórias
        </Button>
        <Button
          variant={showOnlyWithValue ? "default" : "outline"}
          size="sm"
          onClick={() => setShowOnlyWithValue(!showOnlyWithValue)}
          className="h-9"
          data-testid="variables-filter-with-value"
        >
          <CheckCircle className="size-3.5 mr-1.5" />
          Com valor
        </Button>
      </div>

      {!selectedOrgId ? (
        <div className="rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Selecione uma OM para visualizar e editar suas variáveis.
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Carregando catálogo...
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, items]) => (
            <div key={category} data-testid={`variables-group-${category}`}>
              <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-2">
                {category}{" "}
                <span className="text-foreground">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {items.map((v) => (
                  <VariableCard
                    key={v.key}
                    def={v}
                    value={currentValue(v)}
                    editing={edits[v.key] !== undefined}
                    onChange={(val) =>
                      setEdits((e) => {
                        const copy = { ...e };
                        if (val === (v.value ?? "")) delete copy[v.key];
                        else copy[v.key] = val;
                        return copy;
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ))}
          {grouped.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">
              Nenhuma variável encontrada com os filtros atuais.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
        Catálogo
      </p>
      <h1 className="text-3xl font-bold mt-1" data-testid="variables-page-title">
        Variáveis
      </h1>
      <p className="text-muted-foreground mt-1">
        Catálogo oficial (Documento 06). Toda configuração técnica das OMs vive aqui.
      </p>
    </div>
  );
}

function VariableCard({
  def,
  value,
  editing,
  onChange,
}: {
  def: VariableDefinition;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  const hasValue = value && value.trim() !== "";

  return (
    <Card
      className={`hover:border-primary/50 transition-all ${
        editing ? "border-primary/60 ring-1 ring-primary/30" : ""
      }`}
      data-testid={`variable-card-${def.key}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono font-semibold text-sm flex items-center gap-1.5">
              <Variable className="size-3.5 text-primary" />
              {def.key}
              {def.required && (
                <Badge variant="destructive" className="text-[9px] h-4">
                  obrigatória
                </Badge>
              )}
              {!def.editable && (
                <Badge variant="outline" className="text-[9px] h-4">
                  somente leitura
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{def.label}</div>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
            {def.type}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2">{def.description}</p>

        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Valor atual
          </Label>
          {def.type === "boolean" ? (
            <Select
              value={value || "false"}
              onValueChange={(v) => onChange(v)}
              disabled={!def.editable}
            >
              <SelectTrigger className="h-8 text-xs font-mono" data-testid={`variable-input-${def.key}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">true</SelectItem>
                <SelectItem value="false">false</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              data-testid={`variable-input-${def.key}`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={def.exemplo ?? def.defaultValue ?? ""}
              className="font-mono text-xs h-8"
              disabled={!def.editable}
            />
          )}
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>
              {def.defaultValue && (
                <>padrão: <code className="font-mono">{def.defaultValue}</code></>
              )}
            </span>
            <span>
              {hasValue ? (
                <span className="text-success">● configurada</span>
              ) : (
                <span className="text-warning">○ não configurada</span>
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
