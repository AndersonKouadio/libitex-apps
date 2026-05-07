"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { venteAPI } from "@/features/vente/apis/vente.api";
import type { IRapportZ } from "@/features/vente/types/vente.type";
import { BarChart3, Receipt, Banknote, Smartphone, CreditCard, Landmark, CalendarDays } from "lucide-react";

function formatPrix(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

const ICONES_METHODE: Record<string, typeof Banknote> = {
  CASH: Banknote,
  MOBILE_MONEY: Smartphone,
  CARD: CreditCard,
  BANK_TRANSFER: Landmark,
};

const LABELS_METHODE: Record<string, string> = {
  CASH: "Especes",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Carte bancaire",
  BANK_TRANSFER: "Virement",
  CREDIT: "Credit",
};

export default function PageRapports() {
  const { token } = useAuth();
  const { data: emplacements } = useEmplacementListQuery();
  const [empId, setEmpId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [rapport, setRapport] = useState<IRapportZ | null>(null);
  const [chargement, setChargement] = useState(false);

  const selectedEmp = empId || emplacements?.[0]?.id || "";

  async function generer() {
    if (!token || !selectedEmp) return;
    setChargement(true);
    try {
      const r = await venteAPI.rapportZ(token, selectedEmp, date);
      setRapport(r);
    } catch {
      setRapport(null);
    } finally {
      setChargement(false);
    }
  }

  return (
    <>
      <Topbar titre="Rapports" />
      <div className="p-6 max-w-4xl">
        {/* Filtres */}
        <div className="flex items-end gap-3 mb-6">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Emplacement</label>
            <select
              value={selectedEmp}
              onChange={(e) => setEmpId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white min-w-[200px]"
            >
              {(emplacements ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Date</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-white">
              <CalendarDays size={16} className="text-neutral-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm outline-none bg-transparent"
              />
            </div>
          </div>
          <button
            onClick={generer}
            disabled={chargement}
            className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {chargement ? "Chargement..." : "Generer le Z"}
          </button>
        </div>

        {/* Resultat */}
        {rapport && (
          <div className="space-y-4">
            {/* Resume */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 size={18} className="text-teal-600" />
                <h3 className="text-sm font-semibold text-neutral-800">
                  Z de caisse du {new Date(rapport.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </h3>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-neutral-50">
                  <p className="text-xs text-neutral-500 mb-1">Recettes</p>
                  <p className="text-xl font-bold text-neutral-900 tabular-nums">{formatPrix(rapport.resume.totalRevenu)} F</p>
                </div>
                <div className="p-4 rounded-lg bg-neutral-50">
                  <p className="text-xs text-neutral-500 mb-1">Tickets</p>
                  <p className="text-xl font-bold text-neutral-900 tabular-nums">{rapport.resume.totalTickets}</p>
                </div>
                <div className="p-4 rounded-lg bg-neutral-50">
                  <p className="text-xs text-neutral-500 mb-1">TVA collectee</p>
                  <p className="text-xl font-bold text-neutral-900 tabular-nums">{formatPrix(rapport.resume.totalTaxe)} F</p>
                </div>
                <div className="p-4 rounded-lg bg-neutral-50">
                  <p className="text-xs text-neutral-500 mb-1">Ticket moyen</p>
                  <p className="text-xl font-bold text-neutral-900 tabular-nums">
                    {rapport.resume.totalTickets > 0
                      ? formatPrix(Math.round(rapport.resume.totalRevenu / rapport.resume.totalTickets))
                      : "--"} F
                  </p>
                </div>
              </div>
            </div>

            {/* Ventilation par mode de paiement */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h3 className="text-sm font-semibold text-neutral-800 mb-4">Ventilation par mode de paiement</h3>
              {rapport.ventilationPaiements.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4">Aucune vente pour cette journee</p>
              ) : (
                <div className="space-y-2">
                  {rapport.ventilationPaiements.map((p) => {
                    const Icone = ICONES_METHODE[p.methode] || Receipt;
                    const pct = rapport.resume.totalRevenu > 0
                      ? Math.round((p.total / rapport.resume.totalRevenu) * 100) : 0;
                    return (
                      <div key={p.methode} className="flex items-center gap-4 py-3">
                        <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500">
                          <Icone size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-neutral-800">
                              {LABELS_METHODE[p.methode] || p.methode}
                            </span>
                            <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                              {formatPrix(p.total)} F
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                              <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-neutral-400 tabular-nums w-10 text-right">{pct}%</span>
                          </div>
                        </div>
                        <span className="text-xs text-neutral-400 tabular-nums">
                          {p.nombre} tx
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
