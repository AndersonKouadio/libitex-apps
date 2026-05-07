"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { token, enChargement } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!enChargement && !token) router.push("/");
  }, [enChargement, token, router]);

  if (enChargement || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[256px] min-h-screen">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
