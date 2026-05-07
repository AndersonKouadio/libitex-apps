"use client";

import { Topbar } from "@/components/layout/topbar";

export default function UstockPage() {
  return (
    <>
      <Topbar title="Ustock" />
      <div className="p-6">
        <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: "var(--color-neutral-200)" }}>
          <p className="text-lg font-semibold" style={{ color: "var(--color-neutral-800)" }}>
            Module Ustock
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--color-neutral-500)" }}>
            En construction...
          </p>
        </div>
      </div>
    </>
  );
}
