import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Catalogue",
};

export default function FeatureLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
