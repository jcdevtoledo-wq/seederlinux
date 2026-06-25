import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/components/seeder/AppSidebar";
import { AppHeader } from "@/components/seeder/AppHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Loader as Loader2 } from "lucide-react";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel SeederLinux" },
      { name: "description", content: "Painel administrativo SeederLinux — gestco de organizatees, scripts e perfis." },
    ],
  }),
  component: PainelLayout,
});

function PainelLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      nav({ to: "/login" });
    }
  }, [loading, user, nav]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 px-4 lg:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
