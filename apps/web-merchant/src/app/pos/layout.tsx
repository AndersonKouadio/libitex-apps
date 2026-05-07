import { AppShell } from "@/components/layout/app-shell";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <AppShell pleinEcran>{children}</AppShell>;
}
