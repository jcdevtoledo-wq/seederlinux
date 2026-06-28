import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUpsertOrganization, type UpsertOrgInput } from "@/lib/seeder/orgs-api";
import type { Organization } from "@/lib/seeder/types";
import { toast } from "sonner";
import { Building2, Globe, Server } from "lucide-react";

const COLORS = [
  "oklch(0.62 0.16 155)",
  "oklch(0.55 0.12 200)",
  "oklch(0.6 0.18 30)",
  "oklch(0.65 0.18 90)",
  "oklch(0.5 0.18 280)",
  "oklch(0.55 0.18 340)",
];

interface Props {
  trigger: React.ReactNode;
  organization?: Organization;
  onSaved?: () => void;
}

interface FormState {
  id: string;
  nome: string;
  sigla: string;
  descricao: string;
  cor: string;
  ativo: boolean;
  // Variáveis essenciais (catalogadas — Doc 06)
  DOMINIO: string;
  DOMINIO_NETBIOS: string;
  DC_IP: string;
  DNS_PRIMARIO: string;
  DNS_SECUNDARIO: string;
  HOMEPAGE: string;
  DISPLAY_NAME: string;
}

function fromOrg(org?: Organization): FormState {
  return {
    id: org?.id ?? "",
    nome: org?.nome ?? "",
    sigla: org?.sigla ?? "",
    descricao: org?.descricao ?? "",
    cor: org?.cor ?? COLORS[0],
    ativo: org?.ativo ?? true,
    DOMINIO: org?.config?.DOMINIO ?? "",
    DOMINIO_NETBIOS: org?.config?.DOMINIO_NETBIOS ?? "",
    DC_IP: org?.config?.DC_IP ?? "",
    DNS_PRIMARIO: org?.config?.DNS_PRIMARIO ?? "",
    DNS_SECUNDARIO: org?.config?.DNS_SECUNDARIO ?? "",
    HOMEPAGE: org?.config?.HOMEPAGE ?? "",
    DISPLAY_NAME: org?.config?.DISPLAY_NAME ?? org?.nome ?? "",
  };
}

export function OrganizationFormDialog({ trigger, organization, onSaved }: Props) {
  const upsert = useUpsertOrganization();
  const [open, setOpen] = useState(false);
  const isEdit = !!organization;
  const [form, setForm] = useState<FormState>(fromOrg(organization));

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.sigla || !form.nome) {
      toast.error("Sigla e Nome são obrigatórios.");
      return;
    }
    const sigla = form.sigla.toUpperCase();

    const payload: UpsertOrgInput = {
      id: form.id || undefined,
      nome: form.nome,
      sigla,
      descricao: form.descricao,
      ativo: form.ativo,
      cor: form.cor,
      config: {
        DOMINIO: form.DOMINIO,
        DOMINIO_NETBIOS: form.DOMINIO_NETBIOS || sigla,
        DC_IP: form.DC_IP,
        DNS_PRIMARIO: form.DNS_PRIMARIO,
        DNS_SECUNDARIO: form.DNS_SECUNDARIO,
        HOMEPAGE: form.HOMEPAGE,
        DISPLAY_NAME: form.DISPLAY_NAME || form.nome,
      },
    };

    try {
      await upsert.mutateAsync(payload);
      toast.success(`${sigla} ${isEdit ? "atualizada" : "criada"}`);
      onSaved?.();
      setOpen(false);
      if (!isEdit) setForm(fromOrg(undefined));
    } catch (e) {
      toast.error(`Falha ao salvar: ${(e as Error).message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        data-testid="organization-form-dialog"
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar organização" : "Nova organização"}</DialogTitle>
          <DialogDescription>
            Configure os metadados da OM. As variáveis técnicas estão no catálogo
            (aba <strong>Variáveis</strong>). Campos com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Building2 className="size-4" /> Identidade
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Sigla *" hint="Ex: COMARA">
                <Input
                  data-testid="org-sigla-input"
                  value={form.sigla}
                  onChange={(e) => set("sigla", e.target.value.toUpperCase())}
                  placeholder="COMARA"
                />
              </Field>
              <Field label="Nome completo *" hint="Nome da OM">
                <Input
                  data-testid="org-nome-input"
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  placeholder="Comissão de Aeroportos da Amazônia"
                />
              </Field>
              <Field label="Descrição" className="col-span-full">
                <Input
                  data-testid="org-descricao-input"
                  value={form.descricao}
                  onChange={(e) => set("descricao", e.target.value)}
                  placeholder="Descrição breve da OM"
                />
              </Field>
              <Field label="Cor">
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => set("cor", c)}
                      className={`size-8 rounded-md border-2 transition-all ${
                        form.cor === c ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      data-testid={`org-color-${c}`}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Status">
                <div className="flex items-center gap-2 pt-2">
                  <input
                    id="org-ativo"
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => set("ativo", e.target.checked)}
                    data-testid="org-ativo-checkbox"
                  />
                  <Label htmlFor="org-ativo" className="text-sm">
                    Organização ativa
                  </Label>
                </div>
              </Field>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Globe className="size-4" /> Variáveis essenciais
              <span className="text-xs font-normal text-muted-foreground">
                (catalogadas — outras variáveis na aba Variáveis)
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="DOMINIO" hint="Documento 06">
                <Input
                  data-testid="var-DOMINIO"
                  value={form.DOMINIO}
                  onChange={(e) => set("DOMINIO", e.target.value.toLowerCase())}
                  placeholder="comara.intraer"
                  className="font-mono"
                />
              </Field>
              <Field label="DOMINIO_NETBIOS" hint="auto = sigla">
                <Input
                  data-testid="var-DOMINIO_NETBIOS"
                  value={form.DOMINIO_NETBIOS}
                  onChange={(e) => set("DOMINIO_NETBIOS", e.target.value.toUpperCase())}
                  placeholder={form.sigla}
                  className="font-mono"
                />
              </Field>
              <Field label="DC_IP" hint="IP do Controlador">
                <Input
                  data-testid="var-DC_IP"
                  value={form.DC_IP}
                  onChange={(e) => set("DC_IP", e.target.value)}
                  placeholder="10.108.1.10"
                  className="font-mono"
                />
              </Field>
              <Field label="DNS_PRIMARIO">
                <Input
                  data-testid="var-DNS_PRIMARIO"
                  value={form.DNS_PRIMARIO}
                  onChange={(e) => set("DNS_PRIMARIO", e.target.value)}
                  placeholder="10.108.1.10"
                  className="font-mono"
                />
              </Field>
              <Field label="DNS_SECUNDARIO">
                <Input
                  data-testid="var-DNS_SECUNDARIO"
                  value={form.DNS_SECUNDARIO}
                  onChange={(e) => set("DNS_SECUNDARIO", e.target.value)}
                  placeholder="10.108.1.11"
                  className="font-mono"
                />
              </Field>
              <Field label="HOMEPAGE">
                <Input
                  data-testid="var-HOMEPAGE"
                  value={form.HOMEPAGE}
                  onChange={(e) => set("HOMEPAGE", e.target.value)}
                  placeholder="https://intranet.intraer"
                  className="font-mono"
                />
              </Field>
              <Field label="DISPLAY_NAME" className="col-span-full" hint="Nome amigável">
                <Input
                  data-testid="var-DISPLAY_NAME"
                  value={form.DISPLAY_NAME}
                  onChange={(e) => set("DISPLAY_NAME", e.target.value)}
                  placeholder={form.nome}
                />
              </Field>
            </div>
          </section>

          <p className="text-xs text-muted-foreground flex items-start gap-2 border-t pt-3">
            <Server className="size-3.5 shrink-0 mt-0.5" />
            Demais variáveis (proxy, AD, branding completo, repositórios, agente, etc.)
            devem ser configuradas em <strong>Variáveis</strong>. Esta tela edita apenas
            os metadados e o subconjunto crítico de variáveis para o primeiro provisionamento.
          </p>
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="org-cancel-btn">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={upsert.isPending}
            data-testid="org-save-btn"
          >
            {upsert.isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar organização"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs flex items-center gap-2">
        {label}
        {hint && <span className="text-muted-foreground font-normal">({hint})</span>}
      </Label>
      {children}
    </div>
  );
}
