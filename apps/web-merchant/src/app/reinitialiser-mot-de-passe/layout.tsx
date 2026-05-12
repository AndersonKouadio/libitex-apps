import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
};

export default function ReinitialiserMotDePasseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
