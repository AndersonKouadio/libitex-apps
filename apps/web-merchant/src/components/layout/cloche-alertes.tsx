"use client";

import { useState } from "react";
import { Bell, AlertTriangle, PackageX, ArrowRight, Clock, CalendarX } from "lucide-react";
import Link from "next/link";
import { useAlertesDetailQuery } from "@/features/stock/queries/alertes-detail.query";

function libelleJoursRestants(jours: number): string {
  if (jours < 0) return `expiré il y a ${Math.abs(jours)}j`;
  if (jours === 0) return "expire aujourd'hui";
  if (jours === 1) return "expire demain";
  return `expire dans ${jours}j`;
}

/**
 * Cloche d'alertes stock dans la topbar.
 * Badge rouge = nombre de ruptures + alertes + lots expires/bientot expires.
 * Dropdown = sections "Stock" (ruptures/seuil bas) et "Peremption" (lots DLC).
 */
export function ClocheAlertes() {
  const [ouvert, setOuvert] = useState(false);
  const { data } = useAlertesDetailQuery();

  const nbStock = (data?.nbRuptures ?? 0) + (data?.nbAlertes ?? 0);
  const nbPeremption = (data?.nbExpires ?? 0) + (data?.nbBientotPerimes ?? 0);
  const nbTotal = nbStock + nbPeremption;
  const lignes = data?.lignes ?? [];
  const lotsPeremption = data?.lotsPeremption ?? [];

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Alertes stock${nbTotal > 0 ? ` — ${nbTotal} article${nbTotal > 1 ? "s" : ""}` : ""}`}
        onClick={() => setOuvert((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-muted/10 hover:text-foreground"
      >
        <Bell size={18} />
        {nbTotal > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white tabular-nums">
            {nbTotal > 99 ? "99+" : nbTotal}
          </span>
        )}
      </button>

      {ouvert && (
        <>
          {/* Overlay pour fermer en cliquant ailleurs */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOuvert(false)}
          />

          <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-surface shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold text-foreground">Alertes</span>
              {nbTotal > 0 ? (
                <span className="text-xs text-muted tabular-nums">
                  {nbStock > 0 && (
                    <>{data?.nbRuptures}+{data?.nbAlertes} stock</>
                  )}
                  {nbStock > 0 && nbPeremption > 0 && " · "}
                  {nbPeremption > 0 && (
                    <>{data?.nbExpires}+{data?.nbBientotPerimes} péremption</>
                  )}
                </span>
              ) : (
                <span className="text-xs text-success">Tout est OK</span>
              )}
            </div>

            {/* Contenu */}
            <div className="max-h-96 overflow-y-auto">
              {nbTotal === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <Bell size={24} className="text-muted/40" />
                  <p className="text-sm text-muted">Aucune alerte en cours</p>
                </div>
              ) : (
                <>
                  {/* Section Stock */}
                  {lignes.length > 0 && (
                    <div>
                      <div className="bg-muted/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Stock
                      </div>
                      <ul className="divide-y divide-border">
                        {lignes.map((l) => (
                          <li key={l.variantId} className="flex items-start gap-3 px-4 py-3">
                            <span className={[
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                              l.estRupture
                                ? "bg-danger/10 text-danger"
                                : "bg-warning/10 text-warning",
                            ].join(" ")}>
                              {l.estRupture
                                ? <PackageX size={11} />
                                : <AlertTriangle size={11} />
                              }
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {l.nomProduit}
                              </p>
                              {l.nomVariante && (
                                <p className="truncate text-xs text-muted">{l.nomVariante}</p>
                              )}
                              <p className="text-xs text-muted font-mono">{l.sku}</p>
                            </div>
                            <span className={[
                              "shrink-0 text-sm font-semibold tabular-nums",
                              l.estRupture ? "text-danger" : "text-warning",
                            ].join(" ")}>
                              {l.quantite}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Section Peremption */}
                  {lotsPeremption.length > 0 && (
                    <div>
                      <div className="bg-muted/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Péremption (DLC)
                      </div>
                      <ul className="divide-y divide-border">
                        {lotsPeremption.map((l) => (
                          <li key={l.batchId} className="flex items-start gap-3 px-4 py-3">
                            <span className={[
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                              l.estExpire
                                ? "bg-danger/10 text-danger"
                                : l.joursRestants <= 3
                                ? "bg-warning/10 text-warning"
                                : "bg-warning/5 text-warning",
                            ].join(" ")}>
                              {l.estExpire
                                ? <CalendarX size={11} />
                                : <Clock size={11} />
                              }
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {l.nomProduit}
                              </p>
                              {l.nomVariante && (
                                <p className="truncate text-xs text-muted">{l.nomVariante}</p>
                              )}
                              <p className="text-xs text-muted">
                                <span className="font-mono">Lot {l.batchNumber}</span>
                                {" · "}
                                <span className={l.estExpire ? "text-danger font-medium" : ""}>
                                  {libelleJoursRestants(l.joursRestants)}
                                </span>
                              </p>
                            </div>
                            <span className={[
                              "shrink-0 text-sm font-semibold tabular-nums",
                              l.estExpire ? "text-danger" : "text-warning",
                            ].join(" ")}>
                              {l.quantiteRestante}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-2.5">
              <Link
                href="/stock"
                onClick={() => setOuvert(false)}
                className="flex items-center justify-between text-xs font-medium text-accent hover:underline"
              >
                Gérer le stock
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
