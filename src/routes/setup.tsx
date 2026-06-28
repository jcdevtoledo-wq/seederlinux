import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { setupApi, setAuthToken } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CircleCheck as CheckCircle2,
  ChevronRight,
  Loader as Loader2,
  Lock,
  Building2,
  ShieldCheck,
  Globe,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Configuração Inicial - SeederLinux" }] }),
  component: SetupPage,
});

const STEPS = [
  { id: 1, label: "Token", icon: Lock },
  { id: 2, label: "Administrador", icon: ShieldCheck },
  { id: 3, label: "Organização", icon: Building2 },
  { id: 4, label: "Concluído", icon: CheckCircle2 },
] as const;

type Step = (typeof STEPS)[number]["id"];

function SetupPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [token, setToken] = useState("");
  const setupCompleteRef = useRef(false);

  const [admin, setAdmin] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  // Step 3: organização (metadados + variáveis essenciais — Doc 06)
  const [org, setOrg] = useState({
    nome: "",
    sigla: "",
    descricao: "",
    // Variáveis catalogadas (chaves oficiais do Documento 06)
    DOMINIO: "",
    DOMINIO_NETBIOS: "",
    DC_IP: "",
    DNS_PRIMARIO: "",
    DNS_SECUNDARIO: "",
    NTP_SERVER: "pool.ntp.org",
    HOMEPAGE: "",
    DISPLAY_NAME: "",
  });

  useEffect(() => {
    setupApi
      .status()
      .then((status) => {
        if (status.completed) nav({ to: "/login" });
        else setCheckingStatus(false);
      })
      .catch(() => setCheckingStatus(false));
  }, [nav]);

  useEffect(() => {
    if (step === STEPS.length && setupCompleteRef.current) {
      const t = setTimeout(() => nav({ to: "/painel" }), 2000);
      return () => clearTimeout(t);
    }
  }, [step, nav]);

  if (checkingStatus) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Verificando status do sistema...</p>
        </div>
      </div>
    );
  }

  const nextStep = () => setStep((s) => Math.min(s + 1, STEPS.length) as Step);
  const prevStep = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const validateStep1 = () => {
    if (!token.trim()) {
      toast.error("Informe o token de configuração.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!admin.email || !admin.password) {
      toast.error("Preencha email e senha do administrador.");
      return false;
    }
    if (admin.password.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres.");
      return false;
    }
    if (admin.password !== admin.confirm) {
      toast.error("Senhas não coincidem.");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!org.nome || !org.sigla) {
      toast.error("Nome e sigla da organização são obrigatórios.");
      return false;
    }
    if (!org.DOMINIO) {
      toast.error("DOMINIO é obrigatório (Documento 06).");
      return false;
    }
    if (!org.DC_IP) {
      toast.error("DC_IP é obrigatório.");
      return false;
    }
    if (!org.DNS_PRIMARIO) {
      toast.error("DNS_PRIMARIO é obrigatório.");
      return false;
    }
    return true;
  };

  const submitSetup = async () => {
    if (!validateStep3()) return;

    setBusy(true);
    try {
      const sigla = org.sigla.trim().toUpperCase();
      const result = await setupApi.complete({
        setupToken: token.trim(),
        adminEmail: admin.email.trim().toLowerCase(),
        adminPassword: admin.password,
        adminName: admin.name.trim(),
        orgName: org.nome.trim(),
        orgSigla: sigla,
        orgDescricao: org.descricao.trim(),
        variables: {
          DOMINIO: org.DOMINIO.trim().toLowerCase(),
          DOMINIO_NETBIOS: (org.DOMINIO_NETBIOS || sigla).trim().toUpperCase(),
          DC_IP: org.DC_IP.trim(),
          DNS_PRIMARIO: org.DNS_PRIMARIO.trim(),
          DNS_SECUNDARIO: org.DNS_SECUNDARIO.trim(),
          NTP_SERVER: org.NTP_SERVER.trim(),
          HOMEPAGE: org.HOMEPAGE.trim(),
          DISPLAY_NAME: (org.DISPLAY_NAME || org.nome).trim(),
        },
      });

      toast.success("Sistema configurado com sucesso!");
      if (result.token) setAuthToken(result.token);
      setupCompleteRef.current = true;
      setStep(STEPS.length);
    } catch (e: any) {
      const msg = e.message || "Erro ao configurar sistema";
      if (msg.includes("Invalid setup token") || msg.includes("token")) {
        toast.error("Token de configuração inválido.");
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <img src="/seederlinux-logo.png" alt="SeederLinux" className="size-9 object-contain" />
          <div>
            <div className="font-display font-bold leading-tight">SeederLinux</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Configuração inicial - Setup Wizard v3.0
            </div>
          </div>
          <Badge variant="outline" className="ml-auto font-mono text-[10px]" data-testid="setup-step-badge">
            Passo {step} / {STEPS.length}
          </Badge>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="flex items-center gap-1 mb-10 w-full max-w-xl">
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div
                  className={`flex flex-col items-center gap-1 flex-1 ${
                    active ? "opacity-100" : done ? "opacity-70" : "opacity-30"
                  }`}
                >
                  <div
                    className={`size-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      done
                        ? "bg-success text-success-foreground border-success"
                        : active
                          ? "border-primary text-primary bg-primary/10"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
                  </div>
                  <span className="text-[10px] font-mono hidden sm:block">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 max-w-8 ${done ? "bg-success" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="w-full max-w-2xl">
          {/* STEP 1: Token */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="size-5 text-primary" /> Verificação de instalação
                </CardTitle>
                <CardDescription>
                  Informe o token exibido ao final do <code className="font-mono text-xs">install.sh</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Setup Token</Label>
                  <Input
                    data-testid="setup-token-input"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Token gerado pelo instalador"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Encontrado em <code className="font-mono">/opt/seederlinux/.env</code> (variável{" "}
                    <code className="font-mono">SETUP_TOKEN</code>).
                  </p>
                </div>
                <Button
                  data-testid="setup-token-next-btn"
                  className="w-full"
                  onClick={() => validateStep1() && nextStep()}
                  disabled={!token}
                >
                  Verificar e continuar <ChevronRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Admin */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" /> Administrador do Sistema
                </CardTitle>
                <CardDescription>
                  Crie a conta de administrador global (admin_gap).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label>Nome completo</Label>
                  <Input
                    data-testid="setup-admin-name"
                    value={admin.name}
                    onChange={(e) => setAdmin({ ...admin, name: e.target.value })}
                    placeholder="Ten Cel João Silva"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail *</Label>
                  <Input
                    data-testid="setup-admin-email"
                    type="email"
                    value={admin.email}
                    onChange={(e) => setAdmin({ ...admin, email: e.target.value })}
                    placeholder="admin@gapsp.intraer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Senha *</Label>
                    <Input
                      data-testid="setup-admin-password"
                      type="password"
                      value={admin.password}
                      onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirmar senha *</Label>
                    <Input
                      data-testid="setup-admin-confirm"
                      type="password"
                      value={admin.confirm}
                      onChange={(e) => setAdmin({ ...admin, confirm: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prevStep} data-testid="setup-back-btn">
                    <ArrowLeft className="size-4 mr-1" /> Voltar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => validateStep2() && nextStep()}
                    data-testid="setup-admin-next-btn"
                  >
                    Próximo <ChevronRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Organization (metadados + variáveis essenciais — Doc 06) */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-5 text-primary" /> Organização Raiz
                </CardTitle>
                <CardDescription>
                  Configure a primeira OM. As demais variáveis catalogadas serão criadas
                  automaticamente e poderão ser editadas em <strong>Variáveis</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="size-4" /> Identidade
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Sigla *</Label>
                      <Input
                        data-testid="setup-org-sigla"
                        value={org.sigla}
                        onChange={(e) => setOrg({ ...org, sigla: e.target.value.toUpperCase() })}
                        placeholder="COMARA"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nome completo *</Label>
                      <Input
                        data-testid="setup-org-nome"
                        value={org.nome}
                        onChange={(e) => setOrg({ ...org, nome: e.target.value })}
                        placeholder="Comissão de Aeroportos da Amazônia"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label>Descrição</Label>
                      <Input
                        data-testid="setup-org-descricao"
                        value={org.descricao}
                        onChange={(e) => setOrg({ ...org, descricao: e.target.value })}
                        placeholder="Descrição breve da OM"
                      />
                    </div>
                  </div>
                </div>

                {/* Variáveis essenciais (Doc 06 - obrigatórias) */}
                <div className="border-b pb-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Globe className="size-4" /> Variáveis essenciais
                    <span className="text-xs font-normal text-muted-foreground">
                      (catálogo oficial)
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>DOMINIO *</Label>
                      <Input
                        data-testid="setup-var-DOMINIO"
                        value={org.DOMINIO}
                        onChange={(e) => setOrg({ ...org, DOMINIO: e.target.value.toLowerCase() })}
                        placeholder="comara.intraer"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>DOMINIO_NETBIOS</Label>
                      <Input
                        data-testid="setup-var-DOMINIO_NETBIOS"
                        value={org.DOMINIO_NETBIOS}
                        onChange={(e) =>
                          setOrg({ ...org, DOMINIO_NETBIOS: e.target.value.toUpperCase() })
                        }
                        placeholder={org.sigla}
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>DC_IP *</Label>
                      <Input
                        data-testid="setup-var-DC_IP"
                        value={org.DC_IP}
                        onChange={(e) => setOrg({ ...org, DC_IP: e.target.value })}
                        placeholder="10.108.1.10"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>DNS_PRIMARIO *</Label>
                      <Input
                        data-testid="setup-var-DNS_PRIMARIO"
                        value={org.DNS_PRIMARIO}
                        onChange={(e) => setOrg({ ...org, DNS_PRIMARIO: e.target.value })}
                        placeholder="10.108.1.10"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>DNS_SECUNDARIO</Label>
                      <Input
                        data-testid="setup-var-DNS_SECUNDARIO"
                        value={org.DNS_SECUNDARIO}
                        onChange={(e) => setOrg({ ...org, DNS_SECUNDARIO: e.target.value })}
                        placeholder="10.108.1.11"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>NTP_SERVER</Label>
                      <Input
                        data-testid="setup-var-NTP_SERVER"
                        value={org.NTP_SERVER}
                        onChange={(e) => setOrg({ ...org, NTP_SERVER: e.target.value })}
                        placeholder="ntp.intraer"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>HOMEPAGE</Label>
                      <Input
                        data-testid="setup-var-HOMEPAGE"
                        value={org.HOMEPAGE}
                        onChange={(e) => setOrg({ ...org, HOMEPAGE: e.target.value })}
                        placeholder="https://intranet.intraer"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>DISPLAY_NAME</Label>
                      <Input
                        data-testid="setup-var-DISPLAY_NAME"
                        value={org.DISPLAY_NAME}
                        onChange={(e) => setOrg({ ...org, DISPLAY_NAME: e.target.value })}
                        placeholder={org.nome}
                      />
                    </div>
                  </div>
                </div>

                {/* Resumo */}
                <div className="rounded-md bg-muted/40 border p-4 text-xs font-mono space-y-2">
                  <div className="text-sm font-semibold">Resumo da configuração</div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <span>Organização:</span>
                    <span className="text-foreground">
                      {org.sigla} - {org.nome}
                    </span>
                    <span>Domínio:</span>
                    <span className="text-foreground">{org.DOMINIO || "-"}</span>
                    <span>DC_IP:</span>
                    <span className="text-foreground">{org.DC_IP || "-"}</span>
                    <span>Admin:</span>
                    <span className="text-foreground">{admin.email}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep} data-testid="setup-back-btn-3">
                    <ArrowLeft className="size-4 mr-1" /> Voltar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={submitSetup}
                    disabled={busy}
                    data-testid="setup-finalize-btn"
                  >
                    {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Concluir configuração
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 4: Complete */}
          {step === STEPS.length && (
            <Card>
              <CardContent className="pt-8 pb-6 text-center space-y-5">
                <div className="size-16 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-9" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold">SeederLinux Configurado!</h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    O sistema está pronto. Variáveis do catálogo Doc 06 criadas automaticamente.
                  </p>
                </div>
                <div className="rounded-md bg-muted/40 border p-4 text-xs font-mono text-left space-y-1 text-muted-foreground">
                  <p>✓ Banco de dados inicializado</p>
                  <p>✓ Catálogo de variáveis (Doc 06) populado</p>
                  <p>✓ Administrador criado: {admin.email}</p>
                  <p>✓ Organização configurada: {org.sigla}</p>
                  <p>✓ Variáveis padrão atribuídas</p>
                  <p>✓ Branding padrão configurado</p>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => nav({ to: "/painel" })}
                  data-testid="setup-go-to-painel-btn"
                >
                  Ir para o Painel
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
