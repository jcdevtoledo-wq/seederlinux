import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, KeyRound, FileCheck, TriangleAlert as AlertTriangle, Save, Loader as Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/seguranca/")({
  head: () => ({ meta: [{ title: "Seguranca - SeederLinux" }] }),
  component: SegurancaPage,
});

function SegurancaPage() {
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    jwtEnabled: true,
    jwtSecret: "",
    sessionTimeout: 30,
    tokenExpiry: 24,
    forceHttps: true,
    blockHardcodedPasswords: true,
    requireChecksum: true,
    auditLogging: true,
    failedAttempts: 5,
    lockoutDuration: 15,
  });

  async function handleSave() {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      toast.success("Configuracoes de seguranca salvas");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
          Sistema
        </p>
        <h1 className="text-3xl font-bold mt-1 flex items-center gap-2">
          <Shield className="size-7" /> Seguranca
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure autenticacao JWT, sessoes, certificados e politicas de seguranca.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <KeyRound className="size-4" /> Autenticacao JWT
          </CardTitle>
          <CardDescription>Configuracoes do JSON Web Token</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            label="JWT Habilitado"
            desc="Requer token JWT valido para todas as requisicoes autenticadas"
            checked={config.jwtEnabled}
            onChange={(v) => setConfig((p) => ({ ...p, jwtEnabled: v }))}
          />
          <div className="space-y-1.5">
            <Label className="text-xs">Secret JWT</Label>
            <Input
              type="password"
              value={config.jwtSecret}
              onChange={(e) => setConfig((p) => ({ ...p, jwtSecret: e.target.value }))}
              placeholder="••••••••••••••••"
            />
            <p className="text-[10px] text-muted-foreground">Chave secreta para assinatura dos tokens</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Timeout de Sessao (min)</Label>
              <Input
                type="number"
                value={config.sessionTimeout}
                onChange={(e) => setConfig((p) => ({ ...p, sessionTimeout: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expiracao do Token (horas)</Label>
              <Input
                type="number"
                value={config.tokenExpiry}
                onChange={(e) => setConfig((p) => ({ ...p, tokenExpiry: Number(e.target.value) }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="size-4" /> Politicas de Acesso
          </CardTitle>
          <CardDescription>Regras de bloqueio e protecao</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            label="Forcar HTTPS"
            desc="Redireciona todas requisicoes HTTP para HTTPS"
            checked={config.forceHttps}
            onChange={(v) => setConfig((p) => ({ ...p, forceHttps: v }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tentativas Falhas (bloqueio)</Label>
              <Input
                type="number"
                value={config.failedAttempts}
                onChange={(e) => setConfig((p) => ({ ...p, failedAttempts: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Duracao do Bloqueio (min)</Label>
              <Input
                type="number"
                value={config.lockoutDuration}
                onChange={(e) => setConfig((p) => ({ ...p, lockoutDuration: Number(e.target.value) }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileCheck className="size-4" /> Integridade de Scripts
          </CardTitle>
          <CardDescription>Verificacoes de seguranca para scripts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            label="Bloquear Senhas Hardcoded"
            desc="Impede armazenamento de credenciais em scripts"
            checked={config.blockHardcodedPasswords}
            onChange={(v) => setConfig((p) => ({ ...p, blockHardcodedPasswords: v }))}
          />
          <Toggle
            label="Exigir Checksum no Bundle"
            desc="Inclui SHA-256 de todos scripts no manifest.json"
            checked={config.requireChecksum}
            onChange={(v) => setConfig((p) => ({ ...p, requireChecksum: v }))}
          />
          <Toggle
            label="Auditoria Completa"
            desc="Registra todas alteracoes (quem, quando, o que)"
            checked={config.auditLogging}
            onChange={(v) => setConfig((p) => ({ ...p, auditLogging: v }))}
          />
        </CardContent>
      </Card>

      <Card className="bg-warning/5 border-warning/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-4 text-warning mt-0.5" />
            <div className="text-xs">
              <strong className="text-warning">Atencao:</strong> Alteracoes nestas configuracoes afetam todas as estacoes.
              Certifique-se de documentar todas mudancas no sistema de auditoria.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          <Save className="size-4" /> Salvar Configuracoes
        </Button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
