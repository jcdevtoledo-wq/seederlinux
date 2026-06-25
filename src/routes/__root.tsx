import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth/AuthProvider";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SeederLinux — Painel institucional para estações Linux em domínio AD" },
      { name: "description", content: "Plataforma de provisionamento, padronização e gerenciamento de estações Linux em domínio Active Directory. Multi-organização, scripts validados, identidade visual." },
      { name: "author", content: "SeederLinux" },
      { property: "og:title", content: "SeederLinux — Painel institucional para estações Linux em domínio AD" },
      { property: "og:description", content: "Plataforma de provisionamento, padronização e gerenciamento de estações Linux em domínio Active Directory. Multi-organização, scripts validados, identidade visual." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@SeederLinux" },
      { name: "twitter:title", content: "SeederLinux — Painel institucional para estações Linux em domínio AD" },
      { name: "twitter:description", content: "Plataforma de provisionamento, padronização e gerenciamento de estações Linux em domínio Active Directory. Multi-organização, scripts validados, identidade visual." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ce375b28-3353-479d-958c-89b64a00aa39/id-preview-0ad2c5c0--8610de53-b411-40da-b029-79a2c5335661.lovable.app-1778059504327.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ce375b28-3353-479d-958c-89b64a00aa39/id-preview-0ad2c5c0--8610de53-b411-40da-b029-79a2c5335661.lovable.app-1778059504327.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/seederlinux-logo.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
