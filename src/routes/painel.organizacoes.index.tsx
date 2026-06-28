import { createFileRoute, Link } from "@tanstack/react-router";
import { useOrganizations } from "@/lib/seeder/orgs-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Server, Globe, Shield, Users, Loader as Loader2 } from "lucide-react";
import { OrganizationFormDialog } from "@/components/seeder/OrganizationFormDialog";

export const Route = createFileRoute("/painel/organizacoes/")({
  head: () => ({ meta: [{ title: "Organizações · SeederLinux" }] }),
  component: OrganizacoesPage,
});

function OrganizacoesPage() {
  const { data: organizations = [], isLoading, error } = useOrganizations();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
            Multi-OM
          </p>
          <h1 className="text-3xl font-bold mt-1">Organizações</h1>
          <p className="text-muted-foreground mt-1">
            Cada organização possui domínio, scripts, identidade visual e serial próprios.
          </p>
        </div>
        <OrganizationFormDialog
          trigger={
            <Button>
              <Plus className="size-4" /> Nova organização
            </Button>
          }
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando organizações…
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Falha ao carregar: {(error as Error).message}
        </div>
      )}
      {!isLoading && !error && organizations.length === 0 && (
        <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground text-center">
          Nenhuma OM visível. Solicite a um <strong>admin GAP</strong> que atribua seu papel.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {organizations.map((o) => (
          <Link key={o.id} to="/painel/organizacoes/$orgId" params={{ orgId: o.id }}>
            <Card className="h-full hover:shadow-elevated transition-all hover:-translate-y-0.5 cursor-pointer overflow-hidden group">
              <div
                className="h-2 w-full"
                style={{ backgroundColor: o.cor }}
              />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className="size-12 rounded-lg grid place-items-center font-bold text-primary-foreground shadow-elegant shrink-0"
                    style={{ backgroundColor: o.cor }}
                  >
                    {o.sigla.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-lg leading-tight truncate">{o.sigla}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{o.nome}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <Row icon={Globe} label="DOMINIO" value={o.config?.DOMINIO ?? ""} />
                  <Row icon={Server} label="DC_IP" value={o.config?.DC_IP ?? ""} />
                  <Row icon={Shield} label="Status" value={o.ativo ? "Ativa" : "Inativa"} />
                  <Row icon={Users} label="Estações" value={`${o.estacoes}`} />
                </div>

                <div className="flex items-center justify-between pt-3 border-t text-xs">
                  <span className="text-muted-foreground">
                    serial <span className="font-mono text-foreground">{o.serial}</span>
                  </span>
                  <span className="text-primary group-hover:underline">Abrir →</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="size-3.5 shrink-0" />
      <span className="opacity-70 w-16 shrink-0">{label}:</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
}
