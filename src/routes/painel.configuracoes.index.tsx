import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Network, ShieldCheck, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/configuracoes/")({
  head: () => ({ meta: [{ title: "Configurações · SeederLinux" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const [identidade, setIdentidade] = useState({
    gap: "GAP-BE",
    nomeCompleto: "Grupamento de Apoio de Belém",
    instancia: "seederlinux.gapbe.intraer",
    contato: "ti@gapbe.intraer",
    fusoHorario: "America/Belem",
  });

  const salvar = () => toast.success("Configurações salvas (modo demo)");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
          Ajustes
        </p>
        <h1 className="text-3xl font-bold mt-1">Configurações</h1>
        <p className="text-muted-foreground mt-1">Preferências globais da instância SeederLinux.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-primary" /> Identidade do GAP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Sigla do GAP">
              <Input
                value={identidade.gap}
                onChange={(e) => setIdentidade({ ...identidade, gap: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Nome completo">
              <Input
                value={identidade.nomeCompleto}
                onChange={(e) => setIdentidade({ ...identidade, nomeCompleto: e.target.value })}
              />
            </Field>
            <Field label="URL da instância">
              <Input
                value={identidade.instancia}
                onChange={(e) => setIdentidade({ ...identidade, instancia: e.target.value })}
                className="font-mono text-sm"
              />
            </Field>
            <Field label="Contato técnico">
              <Input
                type="email"
                value={identidade.contato}
                onChange={(e) => setIdentidade({ ...identidade, contato: e.target.value })}
              />
            </Field>
            <Field label="Fuso horário">
              <Input
                value={identidade.fusoHorario}
                onChange={(e) => setIdentidade({ ...identidade, fusoHorario: e.target.value })}
                className="font-mono text-sm"
              />
            </Field>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={salvar}><Save className="size-4" /> Salvar identidade</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="size-4 text-primary" /> Operação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle label="Modo offline-first" desc="Priorizar pacotes locais antes de buscar online." />
          <Toggle label="Telemetria opcional" desc="Coleta anônima de uso (sem dados sensíveis)." />
          <Toggle label="Sanitização automática" desc="Verifica scripts antes de publicar no Hub." defaultChecked />
          <Toggle label="Participar do SeederHub" desc="Permite publicar perfis e receber atualizações da federação." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" /> Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle label="Bloquear senhas hardcoded" desc="Impede armazenamento de credenciais em scripts." defaultChecked />
          <Toggle label="Auditoria completa" desc="Registra quem alterou, quando e o quê." defaultChecked />
          <Toggle label="Exigir checksum no bundle" desc="Inclui SHA-256 de todos os scripts no manifest.json." defaultChecked />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Avisos institucionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Mensagem exibida no rodapé do painel">
            <Textarea
              rows={3}
              defaultValue="Uso restrito ao pessoal autorizado da OM. Conforme NSC-1 e ICA 7-30."
              className="text-sm"
            />
          </Field>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">opcional</Badge>
            <span className="text-xs text-muted-foreground">Aparece no header de todos os bundles gerados.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, desc, defaultChecked }: { label: string; desc: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
