import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpsertStation, type Station, type StationStatus } from "@/lib/seeder/stations";
import { useOrganizations } from "@/lib/seeder/orgs-api";
import type { Distro, DesktopEnv } from "@/lib/seeder/types";
import { toast } from "sonner";

const DISTROS: Distro[] = ["ubuntu", "linuxmint", "debian", "rocky", "almalinux", "zorin"];
const DESKTOPS: DesktopEnv[] = ["GNOME", "MATE", "Cinnamon", "XFCE", "KDE", "LXDE"];
const STATUSES: { value: StationStatus; label: string }[] = [
  { value: "ok", label: "OK" },
  { value: "atrasada", label: "Atrasada" },
  { value: "erro", label: "Erro" },
  { value: "nunca", label: "Nunca conectou" },
];

interface Props {
  trigger: React.ReactNode;
  station?: Station;
  defaultOrgId?: string;
}

export function StationFormDialog({ trigger, station, defaultOrgId }: Props) {
  const upsert = useUpsertStation();
  const { data: organizations = [] } = useOrganizations();
  const [open, setOpen] = useState(false);
  const isEdit = !!station;

  const [form, setForm] = useState<Station>(
    station ?? {
      id: "",
      hostname: "",
      orgId: defaultOrgId ?? "",
      ip: "",
      distro: "linuxmint",
      desktop: "Cinnamon",
      serialAplicado: 0,
      ultimoCheckin: "",
      status: "nunca",
      perfilAtivo: undefined,
      usuario: undefined,
    },
  );

  const set = <K extends keyof Station>(k: K, v: Station[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.hostname.trim()) {
      toast.error("Informe o hostname.");
      return;
    }
    if (!form.orgId) {
      toast.error("Selecione a organização.");
      return;
    }
    const id =
      form.id ||
      `${form.orgId}-${form.hostname.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    try {
      await upsert.mutateAsync({ ...form, id, hostname: form.hostname.trim() });
      toast.success(`Estação ${form.hostname} ${isEdit ? "atualizada" : "cadastrada"}`);
      setOpen(false);
    } catch (e) {
      toast.error(`Falha: ${(e as Error).message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar estação" : "Nova estação"}</DialogTitle>
          <DialogDescription>
            Cadastre manualmente uma estação. O agente Linux poderá atualizar o status via check-in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Hostname *">
              <Input
                value={form.hostname}
                onChange={(e) => set("hostname", e.target.value)}
                placeholder="comara-est-001"
                className="font-mono"
              />
            </Field>
            <Field label="Organização *">
              <Select value={form.orgId} onValueChange={(v) => set("orgId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar OM" /></SelectTrigger>
                <SelectContent>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.sigla} — {o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="IP">
              <Input
                value={form.ip}
                onChange={(e) => set("ip", e.target.value)}
                placeholder="10.108.64.101"
                className="font-mono"
              />
            </Field>
            <Field label="Usuário">
              <Input
                value={form.usuario ?? ""}
                onChange={(e) => set("usuario", e.target.value || undefined)}
                placeholder="login.do.usuario"
              />
            </Field>
            <Field label="Distribuição">
              <Select value={form.distro} onValueChange={(v) => set("distro", v as Distro)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISTROS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Ambiente desktop">
              <Select value={form.desktop} onValueChange={(v) => set("desktop", v as DesktopEnv)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESKTOPS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Serial aplicado">
              <Input
                type="number"
                value={form.serialAplicado}
                onChange={(e) => set("serialAplicado", Number(e.target.value))}
                className="font-mono"
              />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v as StationStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "Salvando…" : isEdit ? "Salvar" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
