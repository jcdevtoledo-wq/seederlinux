import { createFileRoute } from "@tanstack/react-router";
import { useProfiles } from "@/lib/seeder/profiles-api";
import { useOrganizations } from "@/lib/seeder/orgs-api";
import { useScripts } from "@/lib/seeder/scripts-api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Plus, Globe, Lock, Loader as Loader2, Package, Server, Shield, Cpu } from "lucide-react";
import { ProfileFormDialog } from "@/components/seeder/ProfileFormDialog";

export const Route = createFileRoute("/painel/perfis/")({
  head: () => ({ meta: [{ title: "Perfis de Deploy - SeederLinux" }] }),
  component: PerfisPage,
});

const PROFILE_TYPES = [
  {
    id: "minimal",
    nome: "Minimal",
    descricao: "Scripts essenciais apenas - DNS e NTP",
    icon: Server,
    color: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    scriptIds: ["core-001", "core-002", "core-003", "core-004"],
  },
  {
    id: "standard",
    nome: "Standard",
    descricao: "Deploy padrao - inclui Proxy, Auth e Branding",
    icon: Package,
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    scriptIds: ["core-001", "core-002", "core-003", "core-004", "core-005", "core-006", "core-007", "core-011"],
  },
  {
    id: "full",
    nome: "Full",
    descricao: "Completo - todas as funcionalidades CORE",
    icon: Cpu,
    color: "bg-purple-500/10 text-purple-700 border-purple-500/30",
    scriptIds: ["core-001", "core-002", "core-003", "core-004", "core-005", "core-006", "core-007", "core-008", "core-009", "core-010", "core-011", "core-012"],
  },
];

function PerfisPage() {
  const { data: profiles = [], isLoading } = useProfiles();
  const { data: organizations = [] } = useOrganizations();
  const { data: scripts = [] } = useScripts();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin_gap");

  const coreScripts = scripts.filter((s) => s.oficial);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
            Provisionamento
          </p>
          <h1 className="text-3xl font-bold mt-1">Perfis de Deploy</h1>
          <p className="text-muted-foreground mt-1">
            Templates de scripts aplicaveis a estacoes durante o provisionamento.
          </p>
        </div>
        {isAdmin && (
          <ProfileFormDialog
            trigger={<Button><Plus className="size-4" /> Novo perfil</Button>}
          />
        )}
      </div>

      <Tabs defaultValue="core" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="core"><Shield className="size-4 mr-1.5" /> CORE Templates</TabsTrigger>
          <TabsTrigger value="custom"><Layers className="size-4 mr-1.5" /> Perfis Customizados</TabsTrigger>
        </TabsList>

        <TabsContent value="core">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {PROFILE_TYPES.map((pt) => {
              const Icon = pt.icon;
              const profile = profiles.find((p) => p.profileType === pt.id);
              const scriptList = pt.scriptIds.map((id) => scripts.find((s) => s.id === id)).filter(Boolean);

              return (
                <Card key={pt.id} className="hover:shadow-elegant transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-md grid place-items-center ${pt.color}`}>
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{pt.nome}</CardTitle>
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {pt.scriptIds.length} scripts
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{pt.descricao}</p>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Scripts incluidos:</p>
                      <div className="flex flex-wrap gap-1">
                        {scriptList.slice(0, 4).map((s) => s && (
                          <Badge key={s.id} variant="secondary" className="text-[10px]">{s.nome.split(" - ")[0]}</Badge>
                        ))}
                        {scriptList.length > 4 && (
                          <Badge variant="outline" className="text-[10px]">+{scriptList.length - 4}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">
                Os perfis CORE sao pre-definidos e imutaveis. Eles determinam quais scripts serao executados
                durante o provisionamento de uma estacao. O perfil "Standard" e recomendado para a maioria das OMs.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : profiles.filter((p) => p.profileType === "custom" || !p.profileType).length === 0 ? (
            <Card className="bg-muted/30">
              <CardContent className="py-12 text-center">
                <Layers className="size-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum perfil customizado. {isAdmin && "Clique em Novo perfil para criar um template personalizado."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {profiles.filter((p) => p.profileType === "custom" || !p.profileType).map((p) => {
                const org = organizations.find((o) => o.id === p.organizacaoOrigem);
                const scriptList = p.scriptIds.map((id) => scripts.find((s) => s.id === id)).filter(Boolean);
                return (
                  <Card key={p.id} className="hover:shadow-elegant transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-md bg-gradient-accent text-accent-foreground grid place-items-center">
                            <Layers className="size-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{p.nome}</CardTitle>
                            {org && (
                              <span className="text-xs text-muted-foreground font-mono">
                                origem: {org.sigla}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={p.publico ? "default" : "outline"} className="text-[10px] gap-1">
                          {p.publico ? <Globe className="size-3" /> : <Lock className="size-3" />}
                          {p.publico ? "publico" : "privado"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{p.descricao}</p>
                      <div className="space-y-1.5">
                        {scriptList.slice(0, 5).map((s) => s && (
                          <div key={s.id} className="flex items-center justify-between text-xs border-b last:border-0 py-1.5">
                            <span className="font-mono">{s.nome}</span>
                            <span className="text-muted-foreground">v{s.versao}</span>
                          </div>
                        ))}
                        {scriptList.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center">+{scriptList.length - 5} scripts</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
