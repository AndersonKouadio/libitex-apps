import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Caisse",
};

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <AppShell pleinEcran>{children}</AppShell>;
}
