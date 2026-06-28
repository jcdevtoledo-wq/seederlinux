import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { generateOrgConfBash, diagnoseOrgCoverage } from "@/lib/seeder/store";
import { useOrganization } from "@/lib/seeder/orgs-api";
import { useScripts } from "@/lib/seeder/scripts-api";
import { useProfiles } from "@/lib/seeder/profiles-api";
import { useOrgValidation, useExportOrgConf } from "@/lib/seeder/variables-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrgRunStatsCard } from "@/components/seeder/OrgRunStatsCard";
import { OrganizationFormDialog } from "@/components/seeder/OrganizationFormDialog";
import { buildBundle, downloadBlob } from "@/lib/seeder/bundle";
import { logEvent } from "@/lib/seeder/audit";
import {
  ArrowLeft,
  Download,
  Copy,
  Building2,
  Pencil,
  Package,
  TriangleAlert as AlertTriangle,
  CircleCheck as CheckCircle2,
  Loader as Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/organizacoes/$orgId")({
  head: ({ params }) => ({ meta: [{ title: `${params.orgId} - SeederLinux` }] }),
  component: OrganizacaoDetail,
});

function OrganizacaoDetail() {
  const { orgId } = useParams({ from: "/painel/organizacoes/$orgId" });
  const { data: scripts = [] } = useScripts();
  const { data: profiles = [] } = useProfiles();
  const { data: org, isLoading } = useOrganization(orgId);
  const { data: validation } = useOrgValidation(orgId);
  const exportConf = useExportOrgConf();

  const [perfilId, setPerfilId] = useState<string>("all");

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando...
      </div>
    );
  }
  if (!org) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Organização não encontrada ou sem acesso.</p>
        <Link to="/painel/organizacoes" className="text-primary underline">
          Voltar
        </Link>
      </div>
    );
  }

  const allScripts = scripts.filter((s: any) => s.status !== "rascunho");
  const orgProfiles = profiles.filter((p: any) => p.organizacaoOrigem === org.sigla || p.publico);
  const perfilSelecionado = profiles.find((p: any) => p.id === perfilId);
  const scriptsNoBundle = perfilSelecionado
    ? allScripts.filter((s: any) => perfilSelecionado.scriptIds.includes(s.id))
    : allScripts;
  const conf = generateOrgConfBash(org);
  const { required, missing } = diagnoseOrgCoverage(org, scriptsNoBundle);

  const configEntries = Object.entries(org.config ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const groupedConfig = configEntries.reduce<Record<string, [string, string][]>>(
    (acc, [k, v]) => {
      const prefix = k.split("_")[0];
      (acc[prefix] ||= []).push([k, v]);
      return acc;
    },
    {}
  );

  const baixarConf = async () => {
    try {
      const result = await exportConf.mutateAsync(org.id);
      const blob = new Blob([result.data.content], { type: "text/x-shellscript" });
      downloadBlob(blob, result.data.filename);
      toast.success(`${result.data.filename} baixado (serial ${result.data.serial})`);
    } catch {
      const blob = new Blob([conf], { type: "text/x-shellscript" });
      downloadBlob(blob, `${org.sigla.toLowerCase()}.conf`);
      toast.success(`${org.sigla.toLowerCase()}.conf baixado`);
    }
  };

  const copiarConf = async () => {
    await navigator.clipboard.writeText(conf);
    toast.success("Configuração copiada");
  };

  return (
    <div className="space-y-6" data-testid="organization-detail-page">
      <Link
        to="/painel/organizacoes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Organizações
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="size-16 rounded-xl grid place-items-center font-bold text-2xl text-primary-foreground shadow-elevated"
            style={{ backgroundColor: org.cor }}
            data-testid="org-color-badge"
          >
            {org.sigla.slice(0, 3)}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono flex items-center gap-1.5">
              <Building2 className="size-3" /> Organização
            </p>
            <h1 className="text-3xl font-bold mt-1" data-testid="org-sigla-heading">
              {org.sigla}
            </h1>
            <p className="text-muted-foreground">{org.nome}</p>
            {org.descricao && <p className="text-xs text-muted-foreground mt-1">{org.descricao}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <OrganizationFormDialog
            organization={org}
            trigger={
              <Button variant="outline" data-testid="org-edit-btn">
                <Pencil className="size-4" /> Editar
              </Button>
            }
          />
          <Select value={perfilId} onValueChange={setPerfilId}>
            <SelectTrigger className="w-[220px]" data-testid="org-profile-select">
              <SelectValue placeholder="Perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os scripts ({allScripts.length})</SelectItem>
              {profiles.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome} ({p.scriptIds.length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={copiarConf} data-testid="org-copy-conf-btn">
            <Copy className="size-4" /> Copiar conf
          </Button>
          <Button
            variant="outline"
            data-testid="org-bundle-btn"
            onClick={async () => {
              const blob = await buildBundle(org, scriptsNoBundle);
              const suffix = perfilSelecionado ? `_${perfilSelecionado.id}` : "";
              downloadBlob(blob, `${org.sigla.toLowerCase()}${suffix}_seeder.zip`);
              logEvent({
                categoria: "bundle",
                acao: "Bundle gerado",
                alvo: org.sigla,
                detalhes: `${scriptsNoBundle.length} scripts - serial ${org.serial}`,
              });
              toast.success(`Bundle ${org.sigla} gerado (${scriptsNoBundle.length} scripts)`);
            }}
          >
            <Package className="size-4" /> Bundle .zip
          </Button>
          <Button onClick={baixarConf} data-testid="org-download-conf-btn">
            <Download className="size-4" /> .conf
          </Button>
        </div>
      </div>

      {/* Alerta de variáveis obrigatórias faltantes (validação backend) */}
      {validation && !validation.valid && (
        <div
          className="rounded-md border border-warning/40 bg-warning/5 p-4 flex items-start gap-3"
          data-testid="org-validation-warning"
        >
          <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>
              {validation.missing.length} variável(is) obrigatória(s) ainda não definida(s):
            </strong>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {validation.missing.map((m) => (
                <Badge
                  key={m.key}
                  variant="outline"
                  className="font-mono text-[10px] border-warning/50 text-warning"
                >
                  {m.key}
                </Badge>
              ))}
            </div>
            {validation.invalid.length > 0 && (
              <p className="text-xs mt-2 text-muted-foreground">
                {validation.invalid.length} valor(es) com tipo inválido.
              </p>
            )}
          </div>
        </div>
      )}

      <OrgRunStatsCard orgId={org.id} />

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo" data-testid="tab-resumo">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="vars" data-testid="tab-vars">
            Variáveis ({configEntries.length})
          </TabsTrigger>
          <TabsTrigger value="cobertura" data-testid="tab-cobertura">
            Cobertura ({required.length - missing.length}/{required.length})
          </TabsTrigger>
          <TabsTrigger value="perfis" data-testid="tab-perfis">
            Perfis ({orgProfiles.length})
          </TabsTrigger>
          <TabsTrigger value="bash" data-testid="tab-bash">
            Arquivo .conf
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Metadados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <ConfigRow label="Sigla" value={org.sigla} />
                <ConfigRow label="Nome" value={org.nome} />
                <ConfigRow label="Status" value={org.ativo ? "Ativa" : "Inativa"} />
                <ConfigRow label="Serial" value={String(org.serial)} />
                <ConfigRow label="Estações" value={String(org.estacoes)} />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Configuração ({configEntries.length} variáveis)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm max-h-[420px] overflow-auto">
                {configEntries
                  .filter(([, v]) => v && v.trim() !== "")
                  .slice(0, 24)
                  .map(([k, v]) => (
                    <ConfigRow key={k} label={k} value={v} mono />
                  ))}
                {configEntries.filter(([, v]) => v && v.trim() !== "").length === 0 && (
                  <p className="text-muted-foreground text-xs col-span-2">
                    Nenhum valor preenchido ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vars" className="mt-5 space-y-5">
          {Object.entries(groupedConfig).map(([group, entries]) => (
            <Card key={group}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono uppercase tracking-wider">
                  {group}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {entries.map(([k, v]) => (
                  <ConfigRow key={k} label={k} value={v || "(vazio)"} mono />
                ))}
              </CardContent>
            </Card>
          ))}
          {configEntries.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma variável definida.
            </p>
          )}
        </TabsContent>

        <TabsContent value="cobertura" className="mt-5">
          <Card>
            <CardContent className="p-0 divide-y">
              {required.map((key) => {
                const present = !!(org.config?.[key] && org.config[key].trim() !== "");
                const usadoPor = allScripts.filter((s: any) =>
                  (s.variaveisUsadas ?? []).includes(key)
                );
                return (
                  <div key={key} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      {present ? (
                        <CheckCircle2 className="size-4 text-success shrink-0" />
                      ) : (
                        <AlertTriangle className="size-4 text-warning shrink-0" />
                      )}
                      <span className="font-mono text-sm">{key}</span>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      Usada por {usadoPor.length} script{usadoPor.length === 1 ? "" : "s"}
                    </div>
                  </div>
                );
              })}
              {required.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  Nenhum script publicado consome variáveis.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perfis" className="mt-5 grid gap-3">
          {orgProfiles.map((p: any) => {
            const ativo = p.id === perfilId;
            return (
              <Card key={p.id} className={ativo ? "border-primary" : ""}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-2">
                      {p.nome}
                      {ativo && <Badge className="text-[10px]">ativo</Badge>}
                      {p.publico && (
                        <Badge variant="outline" className="text-[10px]">
                          público
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.descricao}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="font-mono">
                      {p.scriptIds?.length || 0} scripts
                    </Badge>
                    <Button
                      size="sm"
                      variant={ativo ? "default" : "outline"}
                      onClick={() => setPerfilId(ativo ? "all" : p.id)}
                    >
                      {ativo ? "Desaplicar" : "Aplicar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {orgProfiles.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">
              Nenhum perfil aplicável.
            </p>
          )}
        </TabsContent>

        <TabsContent value="bash" className="mt-5">
          <div
            className="terminal-block p-5 text-xs leading-relaxed overflow-auto max-h-[600px]"
            data-testid="org-conf-preview"
          >
            <pre>{conf}</pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/30 pb-1">
      <span className="text-muted-foreground font-mono text-xs">{label}:</span>
      <span
        className={`text-right truncate max-w-[60%] text-xs ${mono ? "font-mono" : ""}`}
        title={value}
      >
        {value || "-"}
      </span>
    </div>
  );
}
