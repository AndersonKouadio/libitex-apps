export default function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  // Pas d'AppShell : la boutique publique est consultable par n'importe qui,
  // pas de sidebar de gestion. QueryProvider/AuthProvider du layout racine
  // restent en place (AuthProvider est inoffensif en absence de token).
  return <div className="min-h-screen bg-background">{children}</div>;
}
