import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LIBITEX",
  description: "Gestion commerciale — ERP & Point de Vente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} light`} data-theme="light" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
