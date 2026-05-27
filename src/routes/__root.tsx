import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { MobileNav } from "@/components/MobileNav";

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
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
