import { createFileRoute, Link } from "@tanstack/react-router";
import { useOrganizations } from "@/lib/seeder/orgs-api";
import { useScripts } from "@/lib/seeder/scripts-api";
import { useProfiles } from "@/lib/seeder/profiles-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ScrollText, Layers, Activity, ArrowUpRight, Cpu, Workflow } from "lucide-react";
import { StatusBadge } from "@/components/seeder/StatusBadge";
import { OrgRunStatsCard } from "@/components/seeder/OrgRunStatsCard";

export const Route = createFileRoute("/painel/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: organizations = [] } = useOrganizations();
  const { data: scripts = [] } = useScripts();
  const { data: profiles = [] } = useProfiles();
  const totalEstacoes = organizations.reduce((acc, o) => acc + o.estacoes, 0);
  const validados = scripts.filter((s) => s.status !== "rascunho").length;
  const recentes = [...scripts].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
            Painel administrativo
          </p>
          <h1 className="text-3xl lg:text-4xl font-bold mt-1 text-balance">
            Visão geral do ecossistema
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Estações Linux ingressadas em domínio, scripts validados e organizações sob gestão.
          </p>
        </div>
        <div className="terminal-block px-4 py-3 text-xs">
          <span className="opacity-70">$</span> seederctl status --all
          <br />
          <span className="text-success">●</span> healthy · serial sincronizado
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Organizações" value={organizations.length} icon={Building2} hint="Multi-OM ativas" />
        <StatCard label="Estações" value={totalEstacoes} icon={Cpu} hint="Ingressadas em AD" />
        <StatCard label="Scripts" value={`${validados}/${scripts.length}`} icon={ScrollText} hint="Validados / total" />
        <StatCard label="Perfis" value={profiles.length} icon={Layers} hint="Templates reutilizáveis" />
      </div>

      <OrgRunStatsCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-primary" /> Atividade recente
            </CardTitle>
            <Link to="/painel/scripts" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="divide-y">
            {recentes.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-mono text-sm font-medium truncate">{s.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {s.oficial ? "Oficial" : "Custom"} · v{s.versao} · serial {s.serial}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="size-4 text-primary" /> Organizações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {organizations.map((o) => (
              <Link
                key={o.id}
                to="/painel/organizacoes/$orgId"
                params={{ orgId: o.id }}
                className="block p-3 rounded-md border hover:border-primary hover:shadow-elegant transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-md grid place-items-center font-bold text-sm text-primary-foreground"
                    style={{ backgroundColor: o.cor }}
                  >
                    {o.sigla.slice(0, 3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{o.sigla}</div>
                    <div className="text-xs text-muted-foreground truncate font-mono">
                      {o.config?.DOMINIO ?? "-"} · {o.estacoes} estações
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial opacity-50 pointer-events-none" />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">{label}</span>
          <Icon className="size-4 text-primary" />
        </div>
        <div className="mt-2 font-display text-3xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{hint}</div>
      </CardContent>
    </Card>
  );
}
