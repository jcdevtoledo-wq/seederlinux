import { useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Menu, X, Terminal, Server, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOrganizations } from "@/lib/seeder/orgs-api";
import { useScripts } from "@/lib/seeder/scripts-api";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV: { to: string; label: string; exact?: boolean }[] = [
  { to: "/painel", label: "Dashboard", exact: true },
  { to: "/painel/organizacoes", label: "Organizações" },
  { to: "/painel/scripts", label: "Scripts" },
  { to: "/painel/perfis", label: "Perfis" },
  { to: "/painel/hub", label: "Hub" },
];

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const nav = useNavigate();
  const { data: organizations = [] } = useOrganizations();
  const { data: scripts = [] } = useScripts();
  const { user, displayName, roles, signOut } = useAuth();
  const initials = (displayName ?? user?.email ?? "?").slice(0, 2).toUpperCase();
  const roleLabel =
    roles.includes("admin_gap") ? "admin GAP" :
    roles.includes("operador_om") ? "operador OM" :
    roles.includes("auditor") ? "auditor" : "sem papel";

  return (
    <header className="h-16 border-b bg-card/80 backdrop-blur sticky top-0 z-30">
      <div className="h-full px-4 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-muted"
            onClick={() => setOpen(!open)}
            aria-label="Abrir menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="lg:hidden flex items-center gap-2">
            <img src="/seederlinux-logo.png" alt="SeederLinux" className="size-8 object-contain" />
            <span className="font-display font-bold">SeederLinux</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs text-muted-foreground font-mono">
          <span className="flex items-center gap-1.5">
            <Server className="size-3.5 text-success" />
            {organizations.length} organizações
          </span>
          <span>{scripts.length} scripts</span>
          <span className="text-success">● online</span>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/painel/scripts">Novo script</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="size-9 rounded-full bg-gradient-accent grid place-items-center text-sm font-semibold text-accent-foreground hover:opacity-90">
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="space-y-0.5">
                <div className="font-medium truncate">{displayName ?? user?.email}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {roleLabel}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  nav({ to: "/login" });
                }}
              >
                <LogOut className="size-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t bg-card px-4 py-3 space-y-1">
          {NAV.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as "/painel"}
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-md text-sm",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
