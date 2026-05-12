import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Ingrédients",
};

export default function IngredientsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
