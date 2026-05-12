"use client";

import { useQuery } from "@tanstack/react-query";
import { venteAPI } from "../apis/vente.api";
import { venteKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

// Les rapports periode portent sur des dates passees -> on cache 5 min.
// L'invalidateVente() de useInvalidateVenteQuery les refresh deja a chaque
// ticket termine, donc le cache long ne cree pas de stale data.
const STALE_RAPPORT = 5 * 60_000;

export function useRapportVentesPeriodeQuery(
  debut: string, fin: string, emplacementId?: string, actif = true,
) {
  const { token } = useAuth();
  return useQuery({
    queryKey: venteKeyQuery("rapport-ventes-periode", debut, fin, emplacementId),
    queryFn: () => venteAPI.rapportVentesPeriode(token!, debut, fin, emplacementId),
    enabled: !!token && actif && !!debut && !!fin,
    staleTime: STALE_RAPPORT,
    gcTime: 10 * 60_000,
  });
}

export function useRapportMargesQuery(
  debut: string, fin: string, emplacementId?: string, actif = true,
) {
  const { token } = useAuth();
  return useQuery({
    queryKey: venteKeyQuery("rapport-marges", debut, fin, emplacementId),
    queryFn: () => venteAPI.rapportMarges(token!, debut, fin, emplacementId),
    enabled: !!token && actif && !!debut && !!fin,
    staleTime: STALE_RAPPORT,
    gcTime: 10 * 60_000,
  });
}

export function useRapportTvaQuery(
  debut: string, fin: string, emplacementId?: string, actif = true,
) {
  const { token } = useAuth();
  return useQuery({
    queryKey: venteKeyQuery("rapport-tva", debut, fin, emplacementId),
    queryFn: () => venteAPI.rapportTva(token!, debut, fin, emplacementId),
    enabled: !!token && actif && !!debut && !!fin,
    staleTime: STALE_RAPPORT,
    gcTime: 10 * 60_000,
  });
}
