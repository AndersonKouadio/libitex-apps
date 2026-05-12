import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changer le mot de passe",
};

export default function ChangerMotDePasseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
