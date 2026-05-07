"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { stockAPI } from "@/features/stock/apis/stock.api";
import type { IStockEmplacement } from "@/features/stock/types/stock.type";
import { Warehouse, MapPin, ArrowDownToLine, Package } from "lucide-react";

export default function PageStock() {
  const { token } = useAuth();
  const { data: emplacements, isLoading } = useEmplacementListQuery();
  const [stockDetail, setStockDetail] = useState<IStockEmplacement[] | null>(null);
  const [empSelectionne, setEmpSelectionne] = useState("");

  async function chargerStock(emplacementId: string) {
    if (!token) return;
    setEmpSelectionne(emplacementId);
    try {
      const stock = await stockAPI.stockParEmplacement(token, emplacementId);
      setStockDetail(stock);
    } catch {
      setStockDetail([]);
    }
  }

  return (
    <>
      <Topbar titre="Gestion du stock" />
      <div className="p-6 max-w-6xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Emplacements</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {emplacements?.length ?? 0} emplacement{(emplacements?.length ?? 0) > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Emplacements */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              {isLoading ? (
                <div className="py-12 text-center"><p className="text-sm text-neutral-400">Chargement...</p></div>
              ) : (emplacements ?? []).length === 0 ? (
                <div className="py-12 text-center px-4">
                  <Warehouse size={28} className="text-neutral-200 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">Aucun emplacement</p>
                </div>
              ) : (
                (emplacements ?? []).map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => chargerStock(emp.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 last:border-0 text-left transition-colors ${
                      empSelectionne === emp.id ? "bg-teal-50" : "hover:bg-neutral-50"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      empSelectionne === emp.id ? "bg-teal-100 text-teal-600" : "bg-neutral-100 text-neutral-400"
                    }`}>
                      <MapPin size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-800 truncate">{emp.nom}</p>
                      <p className="text-xs text-neutral-400 capitalize">{emp.type.toLowerCase()}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Stock */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              {!empSelectionne ? (
                <div className="py-20 text-center">
                  <ArrowDownToLine size={28} className="text-neutral-200 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">Selectionnez un emplacement</p>
                  <p className="text-xs text-neutral-400 mt-1">pour consulter le stock disponible</p>
                </div>
              ) : stockDetail === null ? (
                <div className="py-12 text-center"><p className="text-sm text-neutral-400">Chargement...</p></div>
              ) : stockDetail.length === 0 ? (
                <div className="py-16 text-center">
                  <Package size={28} className="text-neutral-200 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">Aucun stock dans cet emplacement</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 px-4 py-2.5 border-b border-neutral-200 bg-neutral-50">
                    <span className="flex-1 text-xs font-medium text-neutral-500 uppercase tracking-wider">Variante</span>
                    <span className="w-24 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Quantite</span>
                  </div>
                  {stockDetail.map((s) => (
                    <div key={s.varianteId} className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100 last:border-0">
                      <span className="flex-1 text-sm font-mono text-neutral-600 truncate">{s.varianteId.slice(0, 12)}...</span>
                      <span className={`w-24 text-right text-sm font-semibold tabular-nums ${
                        s.quantite <= 0 ? "text-red-600" : s.quantite < 10 ? "text-amber-600" : "text-neutral-900"
                      }`}>
                        {s.quantite}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
