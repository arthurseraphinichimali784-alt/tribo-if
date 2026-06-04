import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { MobileNav } from "@/components/MobileNav";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Button } from "@/components/ui/button";
import { Compass, Home } from "lucide-react";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "StudyHub IF — Marketplace de estudos para Institutos Federais" },
      { name: "description", content: "Compre, venda e compartilhe resumos, flashcards, simulados e aulas para Institutos Federais." },
      { property: "og:title", content: "StudyHub IF — Marketplace de estudos para Institutos Federais" },
      { property: "og:description", content: "Compre, venda e compartilhe resumos, flashcards, simulados e aulas para Institutos Federais." },
      { name: "twitter:title", content: "StudyHub IF — Marketplace de estudos para Institutos Federais" },
      { name: "twitter:description", content: "Compre, venda e compartilhe resumos, flashcards, simulados e aulas para Institutos Federais." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9c2e7641-3c28-4c5e-bba7-e3db44e4ca8c/id-preview-d5487f76--b0c3d97b-5b7e-4574-9a32-456b846b0251.lovable.app-1779317558798.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9c2e7641-3c28-4c5e-bba7-e3db44e4ca8c/id-preview-d5487f76--b0c3d97b-5b7e-4574-9a32-456b846b0251.lovable.app-1779317558798.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <MobileNav />
        <OnboardingModal />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gradient-hero)" }}>
      <div className="text-center max-w-md">
        <div className="font-display text-8xl md:text-9xl font-bold text-gradient leading-none mb-4">404</div>
        <h1 className="font-display text-2xl md:text-3xl font-bold mb-3">Página perdida nos estudos 📚</h1>
        <p className="text-muted-foreground mb-8">
          A URL que você tentou acessar não existe — talvez tenha sido movida, removida, ou nunca existiu.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/">
            <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow">
              <Home className="h-4 w-4 mr-2" /> Voltar pro início
            </Button>
          </Link>
          <Link to="/marketplace">
            <Button variant="outline">
              <Compass className="h-4 w-4 mr-2" /> Explorar marketplace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
