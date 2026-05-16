import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Comptabilité",
};

export default function ComptabiliteLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
