import { AppShell } from "@/components/layout/app-shell";

export default function FeatureLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
