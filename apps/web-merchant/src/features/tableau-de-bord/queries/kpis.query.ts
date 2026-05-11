"use client";

import { useQuery } from "@tanstack/react-query";
import { tableauDeBordAPI } from "../apis/tableau-de-bord.api";
import { tableauDeBordKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useKpisQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: tableauDeBordKeyQuery("kpis"),
    queryFn: () => tableauDeBordAPI.kpis(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useVentesParJourQuery(jours = 7) {
  const { token } = useAuth();
  return useQuery({
    queryKey: tableauDeBordKeyQuery("ventes-par-jour", jours),
    queryFn: () => tableauDeBordAPI.ventesParJour(token!, jours),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useTopProduitsQuery(jours = 7, limit = 10) {
  const { token } = useAuth();
  return useQuery({
    queryKey: tableauDeBordKeyQuery("top-produits", jours, limit),
    queryFn: () => tableauDeBordAPI.topProduits(token!, jours, limit),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useRepartitionPaiementsQuery(jours = 7) {
  const { token } = useAuth();
  return useQuery({
    queryKey: tableauDeBordKeyQuery("repartition-paiements", jours),
    queryFn: () => tableauDeBordAPI.repartitionPaiements(token!, jours),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useKpisPeriodeQuery(jours = 7) {
  const { token } = useAuth();
  return useQuery({
    queryKey: tableauDeBordKeyQuery("kpis-periode", jours),
    queryFn: () => tableauDeBordAPI.kpisPeriode(token!, jours),
    enabled: !!token,
    staleTime: 60_000,
  });
}
