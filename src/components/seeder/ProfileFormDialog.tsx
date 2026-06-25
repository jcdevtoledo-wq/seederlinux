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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpsertProfile } from "@/lib/seeder/profiles-api";
import { useScripts } from "@/lib/seeder/scripts-api";
import { useOrganizations } from "@/lib/seeder/orgs-api";
import type { SeederProfile } from "@/lib/seeder/types";
import { toast } from "sonner";

interface Props {
  trigger: React.ReactNode;
  profile?: SeederProfile;
}

export function ProfileFormDialog({ trigger, profile }: Props) {
  const { data: scripts = [] } = useScripts();
  const { data: organizations = [] } = useOrganizations();
  const upsert = useUpsertProfile();
  const [open, setOpen] = useState(false);
  const isEdit = !!profile;

  const [nome, setNome] = useState(profile?.nome ?? "");
  const [descricao, setDescricao] = useState(profile?.descricao ?? "");
  const [scriptIds, setScriptIds] = useState<string[]>(profile?.scriptIds ?? []);
  const [origem, setOrigem] = useState<string>(profile?.organizacaoOrigem ?? "");
  const [publico, setPublico] = useState<boolean>(profile?.publico ?? false);

  const toggleScript = (id: string) =>
    setScriptIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));

  const handleSave = async () => {
    if (!nome || scriptIds.length === 0) {
      toast.error("Informe nome e ao menos 1 script.");
      return;
    }
    const novo: SeederProfile = {
      id: profile?.id ?? `p-${Date.now()}`,
      nome,
      descricao,
      scriptIds,
      organizacaoOrigem: origem || null,
      publico,
      criadoEm: profile?.criadoEm ?? new Date().toISOString().slice(0, 10),
    };
    try {
      await upsert.mutateAsync(novo);
      toast.success(`Perfil ${nome} ${isEdit ? "atualizado" : "criado"}`);
      setOpen(false);
    } catch (e) {
      toast.error(`Falha: ${(e as Error).message}`);
    }
  };

  const publicaveis = scripts.filter((s) => s.status !== "rascunho");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar perfil" : "Novo perfil"}</DialogTitle>
          <DialogDescription>
            Combine scripts oficiais em um template aplicável a uma ou mais organizações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Estações administrativas" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Organização de origem</Label>
              <Select value={origem || "none"} onValueChange={(v) => setOrigem(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Genérico —</SelectItem>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.sigla}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={publico} onCheckedChange={setPublico} id="publico" />
            <Label htmlFor="publico" className="text-sm">Compartilhar no SeederHub</Label>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Scripts incluídos ({scriptIds.length})</Label>
            <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
              {publicaveis.map((s) => (
                <label key={s.id} className="flex items-start gap-3 p-3 hover:bg-muted/40 cursor-pointer">
                  <Checkbox checked={scriptIds.includes(s.id)} onCheckedChange={() => toggleScript(s.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{s.nome}</span>
                      <Badge variant="outline" className="text-[10px]">{s.categoria}</Badge>
                      <Badge variant="secondary" className="text-[10px]">v{s.versao}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{s.descricao}</p>
                    {s.variaveisUsadas.length > 0 && (
                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        vars: {s.variaveisUsadas.join(", ")}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "Salvando…" : isEdit ? "Salvar" : "Criar perfil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
