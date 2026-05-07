"use client";

import { Topbar } from "@/components/layout/topbar";
import { Settings } from "lucide-react";

export default function PageParametres() {
  return (
    <>
      <Topbar titre="Parametres" />
      <div className="p-6 max-w-6xl">
        <div className="bg-white rounded-xl border border-neutral-200 py-20 text-center">
          <Settings size={32} className="text-neutral-200 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Configuration en cours de developpement</p>
        </div>
      </div>
    </>
  );
}
