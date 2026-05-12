import { Skeleton } from "@heroui/react";
import { PageContainer } from "./page-container";

/**
 * Module 9 D2 : skeleton de page complete pour `loading.tsx` au niveau
 * route segment. Affiche instantanement pendant la navigation client
 * Next.js (au lieu du blank flash pendant la suspension).
 *
 * Trois variantes :
 * - `liste` : header + liste de cartes (catalogue, clients, achats)
 * - `dashboard` : grille KPI + 2 charts (dashboard, rapports)
 * - `detail` : header + colonne info + bloc principal (detail produit)
 */
interface Props {
  variante?: "liste" | "dashboard" | "detail";
}

export function PageSkeleton({ variante = "liste" }: Props) {
  return (
    <PageContainer>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-5 w-48 rounded" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>

      {variante === "dashboard" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <Skeleton className="lg:col-span-2 h-[280px] rounded-xl" />
            <Skeleton className="h-[280px] rounded-xl" />
          </div>
        </>
      ) : variante === "detail" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-[480px] rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
