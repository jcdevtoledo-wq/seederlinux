import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { generateOrgConfBash, diagnoseOrgCoverage } from "@/lib/seeder/store";
import { useOrganizations } from "@/lib/seeder/orgs-api";
import { useScripts } from "@/lib/seeder/scripts-api";
import { useProfiles } from "@/lib/seeder/profiles-api";
import { useVariables } from "@/lib/seeder/variables-api";
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
import { StatusBadge } from "@/components/seeder/StatusBadge";
import { OrgRunStatsCard } from "@/components/seeder/OrgRunStatsCard";
import { OrganizationFormDialog } from "@/components/seeder/OrganizationFormDialog";
import { buildBundle, downloadBlob } from "@/lib/seeder/bundle";
import { logEvent } from "@/lib/seeder/audit";
import { ArrowLeft, Download, Copy, Building2, Pencil, Package, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Loader as Loader2, Globe, Server, Shield, Clock, Printer, Palette } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/organizacoes/$orgId")({
  head: ({ params }) => ({ meta: [{ title: `${params.orgId} - SeederLinux` }] }),
  component: OrganizacaoDetail,
});

function OrganizacaoDetail() {
  const { orgId } = useParams({ from: "/painel/organizacoes/$orgId" });
  const { data: scripts = [] } = useScripts();
  const { data: profiles = [] } = useProfiles();
  const { data: variables = [] } = useVariables();
  const { data: organizations = [], isLoading } = useOrganizations();
  const org = organizations.find((o) => o.id === orgId);

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
        <p className="text-muted-foreground">Organizacao nao encontrada ou sem acesso.</p>
        <Link to="/painel/organizacoes" className="text-primary underline">Voltar</Link>
      </div>
    );
  }

  const allScripts = scripts.filter((s) => s.status !== "rascunho");
  const orgProfiles = profiles.filter((p) => p.organizacaoOrigem === org.id || p.publico);
  const [perfilId, setPerfilId] = useState<string>("all");
  const perfilSelecionado = profiles.find((p) => p.id === perfilId);
  const scriptsNoBundle = perfilSelecionado
    ? allScripts.filter((s) => perfilSelecionado.scriptIds.includes(s.id))
    : allScripts;
  const conf = generateOrgConfBash(org, variables);
  const { required, missing } = diagnoseOrgCoverage(org, scriptsNoBundle);

  const baixarConf = () => {
    const blob = new Blob([conf], { type: "text/x-shellscript" });
    downloadBlob(blob, `${org.sigla.toLowerCase()}.conf`);
    toast.success(`${org.sigla.toLowerCase()}.conf baixado`);
  };

  const copiarConf = async () => {
    await navigator.clipboard.writeText(conf);
    toast.success("Configuracao copiada");
  };

  return (
    <div className="space-y-6">
      <Link to="/painel/organizacoes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Organizacoes
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="size-16 rounded-xl grid place-items-center font-bold text-2xl text-primary-foreground shadow-elevated"
            style={{ backgroundColor: org.cor }}
          >
            {org.sigla.slice(0, 3)}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono flex items-center gap-1.5">
              <Building2 className="size-3" /> Organizacao
            </p>
            <h1 className="text-3xl font-bold mt-1">{org.sigla}</h1>
            <p className="text-muted-foreground">{org.nome}</p>
            {org.descricao && <p className="text-xs text-muted-foreground mt-1">{org.descricao}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <OrganizationFormDialog
            organization={org}
            trigger={<Button variant="outline"><Pencil className="size-4" /> Editar</Button>}
          />
          <Select value={perfilId} onValueChange={setPerfilId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os scripts ({allScripts.length})</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome} ({p.scriptIds.length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={copiarConf}><Copy className="size-4" /> Copiar conf</Button>
          <Button
            variant="outline"
            onClick={async () => {
              const blob = await buildBundle(org, scriptsNoBundle, variables);
              const suffix = perfilSelecionado ? `_${perfilSelecionado.id}` : "";
              downloadBlob(blob, `${org.sigla.toLowerCase()}${suffix}_seeder.zip`);
              logEvent({
                categoria: "bundle",
                acao: "Bundle gerado",
                alvo: org.sigla,
                detalhes: `${scriptsNoBundle.length} scripts - serial ${org.serial}${perfilSelecionado ? ` - perfil ${perfilSelecionado.nome}` : ""}`,
              });
              toast.success(`Bundle ${org.sigla} gerado (${scriptsNoBundle.length} scripts)`);
            }}
          >
            <Package className="size-4" /> Bundle .zip
          </Button>
          <Button onClick={baixarConf}><Download className="size-4" /> .conf</Button>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/5 p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Variaveis faltantes:</strong> {missing.length} variaveis exigidas pelos scripts oficiais nao estao definidas nesta OM.
            <div className="flex flex-wrap gap-1.5 mt-2">
              {missing.map((k) => (
                <Badge key={k} variant="outline" className="font-mono text-[10px] border-warning/50 text-warning">{k}</Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      <OrgRunStatsCard orgId={org.id} />

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuracao</TabsTrigger>
          <TabsTrigger value="vars">Variaveis ({Object.keys(org.variaveis || {}).length})</TabsTrigger>
          <TabsTrigger value="cobertura">Cobertura ({required.length - missing.length}/{required.length})</TabsTrigger>
          <TabsTrigger value="perfis">Perfis ({orgProfiles.length})</TabsTrigger>
          <TabsTrigger value="bash">Arquivo .conf</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Globe className="size-4" /> Dominio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <ConfigRow label="FQDN" value={org.fqdn || org.dominio} />
                <ConfigRow label="NETBIOS" value={org.netbios || org.sigla} />
                <ConfigRow label="Realm" value={org.realm || ""} />
                <ConfigRow label="DC Primario" value={org.dcPrimaryIp || org.dcIp} />
                <ConfigRow label="DC Secundario" value={org.dcSecondaryIp || "-"} />
                <ConfigRow label="DC FQDN" value={org.dcFqdn || org.dcHostname} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Server className="size-4" /> Rede</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <ConfigRow label="DNS Primario" value={org.dnsPrimary} />
                <ConfigRow label="DNS Secundario" value={org.dnsSecondary || "-"} />
                <ConfigRow label="Search Domains" value={(org.searchDomains || []).join(", ") || "-"} />
                <ConfigRow label="HTTP Proxy" value={org.httpProxy || "-"} />
                <ConfigRow label="HTTPS Proxy" value={org.httpsProxy || "-"} />
                <ConfigRow label="No Proxy" value={(org.noProxy || []).join(", ") || "-"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Clock className="size-4" /> NTP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <ConfigRow label="NTP Servers" value={(org.ntpServers || []).join(", ") || "pool.ntp.org"} />
                <ConfigRow label="Timezone" value={org.timezone || "America/Sao_Paulo"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Shield className="size-4" /> Autenticacao</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <ConfigRow label="Backend" value={org.authBackend || org.metodoAd || "sssd"} />
                <ConfigRow label="Metodo" value={org.authMethod || "ads"} />
                <ConfigRow label="Deploy Profile" value={org.deployProfile || "standard"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Printer className="size-4" /> Impressoras</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <ConfigRow label="Servidor CUPS" value={org.printServer || "-"} />
                <ConfigRow label="Impressora Padrao" value={org.defaultPrinter || "-"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Palette className="size-4" /> Estatisticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <ConfigRow label="Status" value={org.status || "active"} />
                <ConfigRow label="Serial" value={String(org.serial || 0)} />
                <ConfigRow label="Estacoes" value={String(org.estacoes || 0)} />
                <ConfigRow label="Scripts Ativos" value={String(org.scriptsAtivos || 0)} />
                <ConfigRow label="Distros" value={(org.distrosSuportadas || []).join(", ")} />
                <ConfigRow label="Desktops" value={(org.ambientesSuportados || []).join(", ")} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vars" className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(org.variaveis || {}).length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              Nenhuma variavel customizada. Os valores padrao serao usados.
            </div>
          ) : (
            Object.entries(org.variaveis || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 border-b border-border/50 pb-1.5">
                <span className="font-mono text-xs text-muted-foreground">{key}</span>
                <span className="font-mono text-xs text-right truncate">{value || "-"}</span>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="cobertura" className="mt-5">
          <Card>
            <CardContent className="p-0 divide-y">
              {required.map((key) => {
                const present = !!(org.variaveis?.[key]);
                const usadoPor = allScripts.filter((s) => s.variaveisUsadas?.includes(key));
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
                <p className="p-6 text-sm text-muted-foreground text-center">Nenhum script publicado consome variaveis.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perfis" className="mt-5 grid gap-3">
          {orgProfiles.map((p) => {
            const ativo = p.id === perfilId;
            return (
              <Card key={p.id} className={ativo ? "border-primary" : ""}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-2">
                      {p.nome}
                      {ativo && <Badge className="text-[10px]">ativo</Badge>}
                      {p.publico && <Badge variant="outline" className="text-[10px]">publico</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.descricao}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="font-mono">{p.scriptIds?.length || 0} scripts</Badge>
                    <Button size="sm" variant={ativo ? "default" : "outline"} onClick={() => setPerfilId(ativo ? "all" : p.id)}>
                      {ativo ? "Desaplicar" : "Aplicar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {orgProfiles.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">Nenhum perfil aplicavel.</p>
          )}
          <p className="text-xs text-muted-foreground text-center pt-2">
            <StatusBadge status="publicado" /> &nbsp;Aplicar um perfil filtra os scripts incluidos no bundle .zip.
          </p>
        </TabsContent>

        <TabsContent value="bash" className="mt-5">
          <div className="terminal-block p-5 text-xs leading-relaxed overflow-auto max-h-[600px]">
            <pre>{conf}</pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-mono text-right truncate max-w-[60%]">{value || "-"}</span>
    </div>
  );
}
