"use client";

import { Topbar } from "@/components/layout/topbar";
import { Users } from "lucide-react";

export default function PageClients() {
  return (
    <>
      <Topbar titre="Clients" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-white rounded-xl border border-neutral-200 py-20 text-center">
          <Users size={32} className="text-neutral-200 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Module clients en cours de developpement</p>
        </div>
      </div>
    </>
  );
}
