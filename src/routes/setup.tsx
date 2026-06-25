import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { setupApi } from "@/lib/api/client";
import { setAuthToken } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CircleCheck as CheckCircle2, ChevronRight, Loader as Loader2, Lock, Building2, ShieldCheck, Palette, Settings2, Globe, Network, Server, Clock, Printer, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Configuracao Inicial - SeederLinux" }] }),
  component: SetupPage,
});

const STEPS = [
  { id: 1, label: "Token", icon: Lock },
  { id: 2, label: "Dominio", icon: Globe },
  { id: 3, label: "Rede", icon: Network },
  { id: 4, label: "Branding", icon: Palette },
  { id: 5, label: "Concluido", icon: CheckCircle2 },
] as const;

type Step = (typeof STEPS)[number]["id"];

function SetupPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [token, setToken] = useState("");
  const setupCompleteRef = useRef(false);

  // Step 2: Admin info
  const [admin, setAdmin] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  // Step 2: Organization basic info
  const [org, setOrg] = useState({
    nome: "",
    sigla: "",
    fqdn: "",
    netbios: "",
    realm: "",
    dcPrimaryIp: "",
    dcSecondaryIp: "",
    dcFqdn: "",
  });

  // Step 3: Network config
  const [network, setNetwork] = useState({
    dnsPrimary: "",
    dnsSecondary: "",
    searchDomains: "",
    ntpServers: "pool.ntp.org",
    timezone: "America/Sao_Paulo",
    httpProxy: "",
    httpsProxy: "",
    ftpProxy: "",
    noProxy: "localhost,127.0.0.1",
    authBackend: "sssd",
    authMethod: "ads",
    printServer: "",
    defaultPrinter: "",
  });

  // Step 4: Branding
  const [branding, setBranding] = useState({
    displayName: "",
    wallpaperUrl: "",
    wallpaperLogin: "",
    logoUrl: "",
    greeterUrl: "",
    theme: "Mint-Y-Dark",
    deployProfile: "standard",
  });

  // Check if setup already completed on mount
  useEffect(() => {
    setupApi.status()
      .then((status) => {
        if (status.completed) {
          nav({ to: "/login" });
        } else {
          setCheckingStatus(false);
        }
      })
      .catch(() => {
        setCheckingStatus(false);
      });
  }, [nav]);

  // Handle redirect after completion
  useEffect(() => {
    if (step === STEPS.length && setupCompleteRef.current) {
      const timer = setTimeout(() => {
        nav({ to: "/painel" });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, nav]);

  // Show loading while checking setup status
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

  // Step navigation
  const nextStep = () => setStep((s) => Math.min(s + 1, STEPS.length) as Step);
  const prevStep = () => setStep((s) => Math.max(s - 1, 1) as Step);

  // Validate step 1
  const validateStep1 = () => {
    if (!token.trim()) {
      toast.error("Informe o token de configuracao.");
      return false;
    }
    return true;
  };

  // Validate step 2
  const validateStep2 = () => {
    if (!admin.email || !admin.password) {
      toast.error("Preencha email e senha do administrador.");
      return false;
    }
    if (admin.password.length < 6) {
      toast.error("Senha deve ter no minimo 6 caracteres.");
      return false;
    }
    if (admin.password !== admin.confirm) {
      toast.error("Senhas nao coincidem.");
      return false;
    }
    if (!org.nome || !org.sigla) {
      toast.error("Nome e sigla da organizacao sao obrigatorios.");
      return false;
    }
    if (!org.fqdn) {
      toast.error("O FQDN do dominio e obrigatorio.");
      return false;
    }
    if (!org.dcPrimaryIp) {
      toast.error("O IP do Domain Controller primario e obrigatorio.");
      return false;
    }
    return true;
  };

  // Validate step 3
  const validateStep3 = () => {
    if (!network.dnsPrimary) {
      toast.error("O DNS primario e obrigatorio.");
      return false;
    }
    return true;
  };

  // Submit setup
  const submitSetup = async () => {
    if (!validateStep2() || !validateStep3()) return;

    setBusy(true);
    try {
      const result = await setupApi.complete({
        setupToken: token.trim(),
        // Admin
        adminEmail: admin.email.trim().toLowerCase(),
        adminPassword: admin.password,
        adminName: admin.name.trim(),
        // Organization
        orgName: org.nome.trim(),
        orgSigla: org.sigla.trim().toUpperCase(),
        // Domain
        fqdn: org.fqdn.trim().toLowerCase(),
        netbios: org.netbios.trim().toUpperCase() || org.sigla.trim().toUpperCase(),
        realm: org.realm.trim().toUpperCase() || org.sigla.trim().toUpperCase() + ".INTRAER",
        dcPrimaryIp: org.dcPrimaryIp.trim(),
        dcSecondaryIp: org.dcSecondaryIp.trim() || undefined,
        dcFqdn: org.dcFqdn.trim(),
        // DNS
        dnsPrimary: network.dnsPrimary.trim(),
        dnsSecondary: network.dnsSecondary.trim() || undefined,
        searchDomains: network.searchDomains.split(",").map(s => s.trim()).filter(Boolean),
        // NTP
        ntpServers: network.ntpServers.split(",").map(s => s.trim()).filter(Boolean),
        timezone: network.timezone,
        // Proxy
        httpProxy: network.httpProxy.trim(),
        httpsProxy: network.httpsProxy.trim(),
        ftpProxy: network.ftpProxy.trim() || undefined,
        noProxy: network.noProxy.split(",").map(s => s.trim()).filter(Boolean),
        // Auth
        authBackend: network.authBackend,
        authMethod: network.authMethod,
        // Printers
        printServer: network.printServer.trim() || undefined,
        defaultPrinter: network.defaultPrinter.trim() || undefined,
        // Branding
        displayName: branding.displayName.trim() || org.nome.trim(),
        wallpaperUrl: branding.wallpaperUrl.trim() || undefined,
        wallpaperLogin: branding.wallpaperLogin.trim() || undefined,
        logoUrl: branding.logoUrl.trim() || undefined,
        greeterUrl: branding.greeterUrl.trim() || undefined,
        theme: branding.theme,
        deployProfile: branding.deployProfile,
      });

      setAuthToken(result.token);
      toast.success("Sistema configurado!");
      setupCompleteRef.current = true;
      setStep(STEPS.length);
    } catch (e: any) {
      const errorMsg = e.message || "Erro ao configurar sistema";
      if (errorMsg.includes("Invalid setup token") || errorMsg.includes("token")) {
        toast.error("Token de configuracao invalido.");
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <img src="/seederlinux-logo.png" alt="SeederLinux" className="size-9 object-contain" />
          <div>
            <div className="font-display font-bold leading-tight">SeederLinux</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Configuracao inicial - Setup Wizard
            </div>
          </div>
          <Badge variant="outline" className="ml-auto font-mono text-[10px]">
            Passo {step} / {STEPS.length}
          </Badge>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* Stepper */}
        <div className="flex items-center gap-1 mb-10 w-full max-w-xl">
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div
                  className={`flex flex-col items-center gap-1 flex-1 ${active ? "opacity-100" : done ? "opacity-70" : "opacity-30"}`}
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
                  <Lock className="size-5 text-primary" /> Verificacao de instalacao
                </CardTitle>
                <CardDescription>
                  Informe o token exibido ao final do <code className="font-mono text-xs">install.sh</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Setup Token</Label>
                  <Input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Token gerado pelo instalador"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Encontrado em <code className="font-mono">/opt/seederlinux/.env</code> (variavel{" "}
                    <code className="font-mono">SETUP_TOKEN</code>).
                  </p>
                </div>
                <Button className="w-full" onClick={() => validateStep1() && nextStep()} disabled={!token}>
                  Verificar e continuar <ChevronRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Admin + Domain */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" /> Administrador e Dominio
                </CardTitle>
                <CardDescription>
                  Configure a conta admin e o dominio Active Directory da organizacao.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Admin */}
                <div className="border-b pb-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Users className="size-4" /> Administrador do Sistema
                  </h3>
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <Label>Nome completo</Label>
                      <Input
                        value={admin.name}
                        onChange={(e) => setAdmin({ ...admin, name: e.target.value })}
                        placeholder="Ten Cel Joao Silva"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>E-mail *</Label>
                      <Input
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
                          type="password"
                          value={admin.password}
                          onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
                          placeholder="Minimo 6 caracteres"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Confirmar senha *</Label>
                        <Input
                          type="password"
                          value={admin.confirm}
                          onChange={(e) => setAdmin({ ...admin, confirm: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organization */}
                <div className="border-b pb-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="size-4" /> Organizacao
                  </h3>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Sigla *</Label>
                        <Input
                          value={org.sigla}
                          onChange={(e) => setOrg({ ...org, sigla: e.target.value.toUpperCase() })}
                          placeholder="GAPSP"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Nome completo *</Label>
                        <Input
                          value={org.nome}
                          onChange={(e) => setOrg({ ...org, nome: e.target.value })}
                          placeholder="Grupamento de Apoio de Sao Paulo"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Domain */}
                <div className="border-b pb-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Globe className="size-4" /> Configuracao de Dominio AD
                  </h3>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label>FQDN *</Label>
                        <Input
                          value={org.fqdn}
                          onChange={(e) => setOrg({ ...org, fqdn: e.target.value.toLowerCase() })}
                          placeholder="gapsp.intraer"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>NETBIOS</Label>
                        <Input
                          value={org.netbios || org.sigla}
                          onChange={(e) => setOrg({ ...org, netbios: e.target.value.toUpperCase() })}
                          placeholder="GAPSP"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>REALM</Label>
                        <Input
                          value={org.realm || org.sigla.toUpperCase() + ".INTRAER"}
                          onChange={(e) => setOrg({ ...org, realm: e.target.value.toUpperCase() })}
                          placeholder="GAPSP.INTRAER"
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Domain Controllers */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Server className="size-4" /> Domain Controllers
                  </h3>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label>DC Primario IP *</Label>
                        <Input
                          value={org.dcPrimaryIp}
                          onChange={(e) => setOrg({ ...org, dcPrimaryIp: e.target.value })}
                          placeholder="10.1.1.10"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>DC Secundario IP</Label>
                        <Input
                          value={org.dcSecondaryIp}
                          onChange={(e) => setOrg({ ...org, dcSecondaryIp: e.target.value })}
                          placeholder="10.1.1.11"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>DC FQDN</Label>
                        <Input
                          value={org.dcFqdn}
                          onChange={(e) => setOrg({ ...org, dcFqdn: e.target.value })}
                          placeholder="dc01.gapsp.intraer"
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep}>Voltar</Button>
                  <Button className="flex-1" onClick={() => validateStep2() && nextStep()}>
                    Proximo <ChevronRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Network */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="size-5 text-primary" /> Rede e Servicos
                </CardTitle>
                <CardDescription>
                  Configure DNS, NTP, Proxy e autenticacao.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* DNS */}
                <div className="border-b pb-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Globe className="size-4" /> DNS
                  </h3>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>DNS Primario *</Label>
                        <Input
                          value={network.dnsPrimary}
                          onChange={(e) => setNetwork({ ...network, dnsPrimary: e.target.value })}
                          placeholder={org.dcPrimaryIp || "8.8.8.8"}
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>DNS Secundario</Label>
                        <Input
                          value={network.dnsSecondary}
                          onChange={(e) => setNetwork({ ...network, dnsSecondary: e.target.value })}
                          placeholder={org.dcSecondaryIp || "8.8.4.4"}
                          className="font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Search Domains (separados por virgula)</Label>
                      <Input
                        value={network.searchDomains}
                        onChange={(e) => setNetwork({ ...network, searchDomains: e.target.value })}
                        placeholder={org.fqdn || "gapsp.intraer"}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* NTP */}
                <div className="border-b pb-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Clock className="size-4" /> NTP e Timezone
                  </h3>
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <Label>Servidores NTP (separados por virgula)</Label>
                      <Input
                        value={network.ntpServers}
                        onChange={(e) => setNetwork({ ...network, ntpServers: e.target.value })}
                        placeholder="pool.ntp.org, ntp.ubuntu.com"
                        className="font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Timezone</Label>
                        <Input
                          value={network.timezone}
                          onChange={(e) => setNetwork({ ...network, timezone: e.target.value })}
                          placeholder="America/Sao_Paulo"
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proxy */}
                <div className="border-b pb-4">
                  <h3 className="text-sm font-semibold mb-3">Proxy (deixe em branco se nao houver)</h3>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>HTTP Proxy</Label>
                        <Input
                          value={network.httpProxy}
                          onChange={(e) => setNetwork({ ...network, httpProxy: e.target.value })}
                          placeholder="10.108.88.4:8080"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>HTTPS Proxy</Label>
                        <Input
                          value={network.httpsProxy}
                          onChange={(e) => setNetwork({ ...network, httpsProxy: e.target.value })}
                          placeholder="10.108.88.4:8080"
                          className="font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>No Proxy (separados por virgula)</Label>
                      <Input
                        value={network.noProxy}
                        onChange={(e) => setNetwork({ ...network, noProxy: e.target.value })}
                        placeholder="localhost,127.0.0.1,10.0.0.0/8"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Auth */}
                <div className="border-b pb-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Settings2 className="size-4" /> Autenticacao
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Backend</Label>
                      <Select
                        value={network.authBackend}
                        onValueChange={(v) => setNetwork({ ...network, authBackend: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sssd">SSSD</SelectItem>
                          <SelectItem value="winbind">Winbind</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Metodo</Label>
                      <Select
                        value={network.authMethod}
                        onValueChange={(v) => setNetwork({ ...network, authMethod: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ads">ADS</SelectItem>
                          <SelectItem value="ldap">LDAP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Printers */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Printer className="size-4" /> Impressoras (opcional)
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Servidor CUPS</Label>
                      <Input
                        value={network.printServer}
                        onChange={(e) => setNetwork({ ...network, printServer: e.target.value })}
                        placeholder="cups.gapsp.intraer"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Impressora Padrao</Label>
                      <Input
                        value={network.defaultPrinter}
                        onChange={(e) => setNetwork({ ...network, defaultPrinter: e.target.value })}
                        placeholder="HP_LaserJet"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep}>Voltar</Button>
                  <Button className="flex-1" onClick={() => validateStep3() && nextStep()}>
                    Proximo <ChevronRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 4: Branding */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="size-5 text-primary" /> Personalizacao
                </CardTitle>
                <CardDescription>
                  Configure identidade visual e perfil de deployment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Branding */}
                <div className="border-b pb-4">
                  <h3 className="text-sm font-semibold mb-3">Identidade Visual</h3>
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <Label>Nome para Exibicao</Label>
                      <Input
                        value={branding.displayName}
                        onChange={(e) => setBranding({ ...branding, displayName: e.target.value })}
                        placeholder={org.nome}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>URL Wallpaper</Label>
                        <Input
                          value={branding.wallpaperUrl}
                          onChange={(e) => setBranding({ ...branding, wallpaperUrl: e.target.value })}
                          placeholder="https://..."
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>URL Wallpaper Login</Label>
                        <Input
                          value={branding.wallpaperLogin}
                          onChange={(e) => setBranding({ ...branding, wallpaperLogin: e.target.value })}
                          placeholder="https://..."
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>URL Logo</Label>
                        <Input
                          value={branding.logoUrl}
                          onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                          placeholder="https://..."
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>URL Greeter</Label>
                        <Input
                          value={branding.greeterUrl}
                          onChange={(e) => setBranding({ ...branding, greeterUrl: e.target.value })}
                          placeholder="https://..."
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Tema</Label>
                        <Select
                          value={branding.theme}
                          onValueChange={(v) => setBranding({ ...branding, theme: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mint-Y-Dark">Mint-Y-Dark</SelectItem>
                            <SelectItem value="Mint-Y">Mint-Y</SelectItem>
                            <SelectItem value="Adwaita-dark">Adwaita Dark</SelectItem>
                            <SelectItem value="Adwaita">Adwaita</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Perfil de Deployment</Label>
                        <Select
                          value={branding.deployProfile}
                          onValueChange={(v) => setBranding({ ...branding, deployProfile: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minimal">Minimal - Essenciais</SelectItem>
                            <SelectItem value="standard">Standard - Padrao</SelectItem>
                            <SelectItem value="full">Full - Completo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-md bg-muted/40 border p-4 text-xs font-mono space-y-2">
                  <div className="text-sm font-semibold">Resumo da Configuracao:</div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <span>Organizacao:</span>
                    <span className="text-foreground">{org.sigla} - {org.nome}</span>
                    <span>Dominio:</span>
                    <span className="text-foreground">{org.fqdn}</span>
                    <span>DC Primario:</span>
                    <span className="text-foreground">{org.dcPrimaryIp}</span>
                    <span>Admin:</span>
                    <span className="text-foreground">{admin.email}</span>
                    <span>Perfil:</span>
                    <span className="text-foreground capitalize">{branding.deployProfile}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep}>Voltar</Button>
                  <Button className="flex-1" onClick={submitSetup} disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Concluir Configuracao
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 5: Complete */}
          {step === STEPS.length && (
            <Card>
              <CardContent className="pt-8 pb-6 text-center space-y-5">
                <div className="size-16 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-9" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold">SeederLinux Configurado!</h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    O sistema esta pronto para uso. Faca login com a conta administrador criada.
                  </p>
                </div>
                <div className="rounded-md bg-muted/40 border p-4 text-xs font-mono text-left space-y-1 text-muted-foreground">
                  <p>Banco de dados inicializado</p>
                  <p>Administrador criado</p>
                  <p>Organizacao configurada: {org.sigla}</p>
                  <p>12 Scripts CORE carregados</p>
                  <p>3 Perfis de deployment disponiveis</p>
                </div>
                <Button className="w-full" size="lg" onClick={() => nav({ to: "/painel" })}>
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
