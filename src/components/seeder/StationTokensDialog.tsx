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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useStationTokens,
  useCreateStationToken,
  useRevokeStationToken,
  useDeleteStationToken,
} from "@/lib/seeder/station-tokens";
import { Copy, Loader2, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";

interface Props {
  trigger: React.ReactNode;
  stationId: string;
  hostname: string;
}

export function StationTokensDialog({ trigger, stationId, hostname }: Props) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("agente");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const { data: tokens = [], isLoading } = useStationTokens(stationId);
  const createMut = useCreateStationToken();
  const revokeMut = useRevokeStationToken();
  const deleteMut = useDeleteStationToken();

  const handleCreate = async () => {
    try {
      const { token } = await createMut.mutateAsync({ stationId, label });
      setIssuedToken(token);
      setLabel("agente");
      toast.success("Token gerado. Copie agora — não será exibido novamente.");
    } catch (e) {
      toast.error(`Falha: ${(e as Error).message}`);
    }
  };

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("Copiado");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setIssuedToken(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tokens de check-in — {hostname}</DialogTitle>
          <DialogDescription>
            Gere um token para o agente Linux instalado na estação. Use no header{" "}
            <code className="font-mono text-xs">x-station-token</code> ao chamar{" "}
            <code className="font-mono text-xs">/api/public/station-checkin</code>.
          </DialogDescription>
        </DialogHeader>

        {issuedToken && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
            <Label className="text-xs">Token (copie agora — não será exibido de novo)</Label>
            <div className="flex gap-2">
              <Input value={issuedToken} readOnly className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={() => copy(issuedToken)}>
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Novo token — rótulo</Label>
          <div className="flex gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="agente-prod"
            />
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Gerar"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Tokens existentes</Label>
          {isLoading ? (
            <div className="grid place-items-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : tokens.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum token emitido.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {tokens.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{t.label}</span>
                      {t.revokedAt && <Badge variant="destructive">revogado</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      criado {new Date(t.createdAt).toLocaleString()}
                      {t.lastUsedAt
                        ? ` • último uso ${new Date(t.lastUsedAt).toLocaleString()}`
                        : " • nunca usado"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!t.revokedAt && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Revogar"
                        onClick={() =>
                          revokeMut.mutate(
                            { id: t.id, stationId },
                            { onSuccess: () => toast.success("Token revogado") },
                          )
                        }
                      >
                        <Ban className="size-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Excluir"
                      onClick={() =>
                        deleteMut.mutate(
                          { id: t.id, stationId },
                          { onSuccess: () => toast.success("Token excluído") },
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
