import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inscription",
};

export default function InscriptionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
