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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddVariable } from "@/lib/seeder/variables-api";
import type { VariableDef, VarType, VarScope } from "@/lib/seeder/types";
import { toast } from "sonner";

interface Props {
  trigger: React.ReactNode;
}

const TIPOS: VarType[] = ["string", "ip", "url", "porta", "bool", "path"];
const ESCOPOS: VarScope[] = ["diretorio", "rede", "servicos", "identidade", "personalizacao", "custom"];

export function VariableFormDialog({ trigger }: Props) {
  const add = useAddVariable();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<VariableDef>({
    key: "",
    label: "",
    descricao: "",
    tipo: "string",
    escopo: "custom",
    oficial: false,
    obrigatoria: false,
    exemplo: "",
    default: "",
  });

  const set = <K extends keyof VariableDef>(k: K, v: VariableDef[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const key = form.key.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!key || !/^[A-Z][A-Z0-9_]+$/.test(key)) {
      toast.error("Chave inválida. Use UPPER_SNAKE_CASE.");
      return;
    }
    if (!form.label) {
      toast.error("Informe um label.");
      return;
    }
    try {
      await add.mutateAsync({ ...form, key, oficial: false });
      toast.success(`Variável ${key} adicionada ao catálogo`);
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
          <DialogTitle>Nova variável customizada</DialogTitle>
          <DialogDescription>
            Variáveis customizadas ficam disponíveis para todas as OMs preencherem em seu .conf.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Chave (UPPER_SNAKE) *">
              <Input
                value={form.key}
                onChange={(e) => set("key", e.target.value.toUpperCase())}
                placeholder="MEU_SERVIDOR"
                className="font-mono"
              />
            </Field>
            <Field label="Label *">
              <Input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Meu servidor" />
            </Field>
            <Field label="Tipo">
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v as VarType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Escopo">
              <Select value={form.escopo} onValueChange={(v) => set("escopo", v as VarScope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESCOPOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Descrição">
            <Textarea
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              rows={2}
              placeholder="Para que serve esta variável?"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Exemplo">
              <Input value={form.exemplo ?? ""} onChange={(e) => set("exemplo", e.target.value)} />
            </Field>
            <Field label="Default">
              <Input value={form.default ?? ""} onChange={(e) => set("default", e.target.value)} />
            </Field>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.obrigatoria} onCheckedChange={(v) => set("obrigatoria", v)} id="obrig" />
            <Label htmlFor="obrig" className="text-sm">Obrigatória</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={add.isPending}>
            {add.isPending ? "Salvando…" : "Adicionar ao catálogo"}
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
