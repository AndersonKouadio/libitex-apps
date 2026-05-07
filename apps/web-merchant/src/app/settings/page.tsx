"use client";

import { Topbar } from "@/components/layout/topbar";

export default function UsettingsPage() {
  return (
    <>
      <Topbar title="Usettings" />
      <div className="p-6">
        <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: "var(--color-neutral-200)" }}>
          <p className="text-lg font-semibold" style={{ color: "var(--color-neutral-800)" }}>
            Module Usettings
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--color-neutral-500)" }}>
            En construction...
          </p>
        </div>
      </div>
    </>
  );
}
