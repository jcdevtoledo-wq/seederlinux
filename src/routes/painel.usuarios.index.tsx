import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, type AppRole } from "@/lib/auth/AuthProvider";
import { useOrganizations } from "@/lib/seeder/orgs-api";
import { usersApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader as Loader2, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/usuarios/")({
  head: () => ({ meta: [{ title: "Usuários · SeederLinux" }] }),
  component: UsuariosPage,
});

interface UserRow {
  id: string;
  email: string;
  displayName: string | null;
  blocked: boolean;
  roles: { id: string; role: AppRole; orgSigla: string | null }[];
}

const ROLES: { value: AppRole; label: string; descr: string }[] = [
  { value: "admin_gap", label: "Admin GAP", descr: "Gerencia tudo, todas as OMs" },
  { value: "operador_om", label: "Operador OM", descr: "Edita variáveis da OM atribuída" },
  { value: "auditor", label: "Auditor", descr: "Leitura de tudo, sem editar" },
];

function UsuariosPage() {
  const { hasRole, loading: authLoading } = useAuth();
  const { data: orgs = [] } = useOrganizations();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AppRole>("operador_om");
  const [orgSigla, setOrgSigla] = useState<string>("");

  const isAdmin = hasRole("admin_gap");

  async function reload() {
    setLoading(true);
    try {
      const users = await usersApi.list();
      setRows(users.map((u: any) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        blocked: u.blocked,
        roles: u.roles ?? [],
      })));
    } catch (e) {
      toast.error("Erro ao carregar usuários");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) reload();
  }, [isAdmin]);

  async function createUser() {
    if (!email || !password) return toast.error("E-mail e senha são obrigatórios.");
    if (role === "operador_om" && !orgSigla) return toast.error("Operador OM precisa de uma OM.");
    setBusy(true);
    try {
      await usersApi.create({
        email,
        password,
        displayName: displayName || undefined,
        role,
        orgSigla: role === "operador_om" ? orgSigla : undefined,
      });
      toast.success("Usuário criado");
      setEmail("");
      setPassword("");
      setDisplayName("");
      setOrgSigla("");
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(false);
  }

  async function deleteUser(id: string) {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    try {
      await usersApi.delete(id);
      toast.success("Usuário removido");
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 space-y-3">
        <Shield className="size-10 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-bold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Esta seção é exclusiva para <strong>admin GAP</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
          Controle de acesso
        </p>
        <h1 className="text-3xl font-bold mt-1 flex items-center gap-2">
          <Users className="size-7" /> Usuários e papéis
        </h1>
        <p className="text-muted-foreground mt-1">
          Crie usuários e atribua papéis. Admin GAP gerencia todo o sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="size-4" /> Novo usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nome" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">E-mail *</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@gap.intraer" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Senha *</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">OM (operador)</Label>
            <Select value={orgSigla} onValueChange={setOrgSigla} disabled={role !== "operador_om"}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.sigla}>{o.sigla}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createUser} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Criar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuários cadastrados ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Carregando…
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Nenhum usuário ainda.</p>
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{r.displayName ?? r.email}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{r.email}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {r.roles.length === 0 && (
                      <Badge variant="outline" className="text-[10px]">sem papel</Badge>
                    )}
                    {r.roles.map((rr) => (
                      <Badge key={rr.id ?? rr.role} variant="secondary" className="text-[10px] gap-1">
                        {ROLES.find((x) => x.value === rr.role)?.label ?? rr.role}
                        {rr.orgSigla && <span className="font-mono">· {rr.orgSigla}</span>}
                      </Badge>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteUser(r.id)}
                      className="h-6 px-2"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
