"use client";

import { useQuery } from "@tanstack/react-query";
import { venteAPI } from "../apis/vente.api";
import { venteKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useRapportVentesPeriodeQuery(
  debut: string, fin: string, emplacementId?: string, actif = true,
) {
  const { token } = useAuth();
  return useQuery({
    queryKey: venteKeyQuery("rapport-ventes-periode", debut, fin, emplacementId),
    queryFn: () => venteAPI.rapportVentesPeriode(token!, debut, fin, emplacementId),
    enabled: !!token && actif && !!debut && !!fin,
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
  });
}
