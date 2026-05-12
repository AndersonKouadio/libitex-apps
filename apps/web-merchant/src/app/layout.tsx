import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { ConfirmationProvider } from "@/providers/confirmation-provider";
import { SWRegister } from "@/providers/sw-register";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LIBITEX",
  description: "ERP, point de vente et e-commerce pour commerçants",
  applicationName: "LIBITEX",
  appleWebApp: {
    capable: true,
    title: "LIBITEX",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1F3B" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${jetbrainsMono.variable} light`} data-theme="light" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <RealtimeProvider>
              <ConfirmationProvider>
                {children}
              </ConfirmationProvider>
              <ToastProvider />
              <SWRegister />
            </RealtimeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
