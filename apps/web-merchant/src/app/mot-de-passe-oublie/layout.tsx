import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
};

export default function MotDePasseOublieLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
