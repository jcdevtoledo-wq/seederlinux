import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Terminal,
  Server,
  Shield,
  Layers,
  Zap,
  Network,
  ArrowRight,
  CheckCircle2,
  Building2,
  ScrollText,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const SAMPLE_BASH = `#!/usr/bin/env bash
# ingressar_dominio.sh — gerado por SeederLinux
source /opt/softwarelivre/etc/comara.conf

detectar_ambiente
detectar_dominio
configurar_sssd

realm join -U admin "\${DOMINIO}"
log "estação ingressada em \${DOMINIO_NETBIOS}"`;

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/seederlinux-logo.png" alt="SeederLinux" className="size-10 object-contain" />
            <div className="leading-tight">
              <div className="font-display font-bold">SeederLinux</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Implementando Linux na FAB
              </div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#recursos" className="text-muted-foreground hover:text-foreground">Recursos</a>
            <a href="#ecossistema" className="text-muted-foreground hover:text-foreground">Ecossistema</a>
            <a href="#fluxo" className="text-muted-foreground hover:text-foreground">Como funciona</a>
          </nav>
          <Button asChild>
            <Link to="/painel">
              Acessar painel <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute inset-0 bg-gradient-radial" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-36">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-xs font-mono">
                <span className="size-1.5 rounded-full bg-success animate-pulse" />
                v0.1.0 — MVP institucional
              </div>
              <h1 className="font-display text-4xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-balance">
                Estações Linux em domínio,{" "}
                <span className="bg-gradient-accent bg-clip-text text-transparent">
                  padronizadas em minutos
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                SeederLinux é a plataforma local para provisionar, ingressar em Active Directory,
                personalizar e atualizar estações Linux em ambientes públicos, militares e
                educacionais. Multi-organização, offline-first, governança nativa.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button asChild size="lg">
                  <Link to="/painel">
                    Abrir painel <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/painel/scripts">Explorar scripts</Link>
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-6 text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" /> Ubuntu · Mint · Debian</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" /> Rocky · AlmaLinux</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-accent opacity-20 blur-3xl rounded-full" />
              <div className="relative terminal-block shadow-elevated overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
                  <span className="size-3 rounded-full bg-destructive/70" />
                  <span className="size-3 rounded-full bg-warning/70" />
                  <span className="size-3 rounded-full bg-success/70" />
                  <span className="ml-3 text-xs opacity-60 font-mono">
                    estacao01@comara ~ #
                  </span>
                </div>
                <pre className="p-5 text-xs lg:text-sm leading-relaxed overflow-x-auto">
                  {SAMPLE_BASH}
                </pre>
                <div className="border-t border-white/10 px-5 py-3 text-xs font-mono opacity-70">
                  ✓ ingressed in COMARA · serial 2025033101
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
              Por que SeederLinux
            </p>
            <h2 className="font-display text-3xl lg:text-5xl font-bold mt-2 text-balance">
              Toda a complexidade do ingresso em domínio,{" "}
              <span className="text-primary">resolvida no painel</span>.
            </h2>
            <p className="text-muted-foreground mt-4">
              Um conjunto modular de scripts shell mantidos por organizações, distribuído
              centralmente, com versionamento por serial e operação offline.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-xl border bg-card hover:shadow-elegant transition-all hover:-translate-y-0.5"
              >
                <div className="size-11 rounded-lg bg-primary/10 text-primary grid place-items-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.icon className="size-5" />
                </div>
                <h3 className="font-display font-bold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ECOSSISTEMA */}
      <section id="ecossistema" className="py-20 lg:py-28 bg-secondary/30 border-y">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
              Dois produtos, um ecossistema
            </p>
            <h2 className="font-display text-3xl lg:text-5xl font-bold mt-2 text-balance">
              SeederLinux <span className="text-muted-foreground">+</span>{" "}
              <span className="text-accent-foreground bg-accent px-2 rounded-md">SeederHub</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-lg">
              O painel local administra sua organização. O Hub federado conecta múltiplas OMs
              para compartilhar scripts validados, perfis e atualizações.
            </p>
            <div className="mt-8 space-y-3">
              {ECO_LIST.map((e) => (
                <div key={e} className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
                  <span className="text-sm">{e}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <EcoCard icon={Building2} title="Multi-OM" value="∞" desc="organizações independentes" />
            <EcoCard icon={ScrollText} title="Scripts" value="9+" desc="categorias documentadas" />
            <EcoCard icon={Network} title="Modos" value="3" desc="online · proxy · offline" />
            <EcoCard icon={Layers} title="Distros" value="5+" desc="Mint · Ubuntu · Rocky..." />
          </div>
        </div>
      </section>

      {/* FLUXO */}
      <section id="fluxo" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
              Fluxo
            </p>
            <h2 className="font-display text-3xl lg:text-5xl font-bold mt-2 text-balance">
              Do painel à estação em produção
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mt-12">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="p-6 rounded-xl border bg-card h-full">
                  <div className="text-xs font-mono text-muted-foreground mb-2">
                    Passo 0{i + 1}
                  </div>
                  <h3 className="font-display font-bold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 lg:px-8">
          <div className="rounded-3xl bg-gradient-hero text-primary-foreground p-10 lg:p-16 relative overflow-hidden shadow-elevated">
            <div className="absolute inset-0 bg-gradient-radial opacity-50" />
            <div className="relative max-w-xl">
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-balance">
                Pronto para padronizar suas estações Linux?
              </h2>
              <p className="mt-4 text-primary-foreground/80">
                Acesse o painel SeederLinux e veja o ecossistema com dados de exemplo.
              </p>
              <Button asChild size="lg" variant="secondary" className="mt-8">
                <Link to="/painel">
                  Abrir painel <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
          <span>© {new Date().getFullYear()} SeederLinux · Software Livre</span>
          <span>built for institutions · open by design</span>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: Server, title: "Ingresso AD automatizado", desc: "Detecta ambiente, descobre o controlador e ingressa via SSSD ou Winbind." },
  { icon: Building2, title: "Multi-organização", desc: "Cada OM com domínio, scripts, identidade visual e serial próprios." },
  { icon: Shield, title: "Sanitização e auditoria", desc: "Bloqueia senhas hardcoded, registra alterações e exige revisão antes de publicar." },
  { icon: Zap, title: "Atualizações por serial", desc: "Serial global e individual por script — atualização seletiva, sem downtime." },
  { icon: Layers, title: "Perfis reutilizáveis", desc: "Combine scripts em templates aplicáveis por tipo de estação." },
  { icon: Network, title: "Offline-first", desc: "Operação por mídia local, proxy ou online — autenticação com cache offline." },
];

const ECO_LIST = [
  "Painel local (SeederLinux) com administração completa de OMs e scripts.",
  "Hub federado (SeederHub) opcional para colaboração entre organizações.",
  "Catálogo de scripts com documentação, versionamento e estado de validação.",
  "Suporte a 6 ambientes desktop: GNOME, MATE, Cinnamon, XFCE, KDE, LXDE.",
];

const STEPS = [
  { title: "Cadastre a OM", desc: "Domínio, DC, DNS, proxy, AD." },
  { title: "Selecione scripts", desc: "Importe seus .sh existentes ou monte um perfil." },
  { title: "Gere o bundle", desc: "Conf parametrizado pronto para download." },
  { title: "Implante", desc: "Execute o orquestrador na estação Linux." },
];

function EcoCard({
  icon: Icon,
  title,
  value,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  desc: string;
}) {
  return (
    <div className="p-5 rounded-xl border bg-card hover:shadow-elegant transition-shadow">
      <Icon className="size-5 text-primary" />
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-1">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}
