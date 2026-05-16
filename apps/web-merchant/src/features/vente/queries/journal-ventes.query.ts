"use client";

import { useQuery } from "@tanstack/react-query";
import { venteAPI } from "../apis/vente.api";
import { venteKeyQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface ParamsJournal {
  page?: number;
  emplacementId?: string;
  statut?: string;
  dateDebut?: string;
  dateFin?: string;
}

const PAGE_SIZE = 25;

export function useJournalVentesQuery(params: ParamsJournal) {
  const { token } = useAuth();

  return useQuery({
    queryKey: venteKeyQuery("journal", params),
    queryFn: () =>
      venteAPI.listerJournal(token!, {
        page: params.page ?? 1,
        limit: PAGE_SIZE,
        emplacementId: params.emplacementId,
        statut: params.statut,
        dateDebut: params.dateDebut,
        dateFin: params.dateFin,
      }),
    enabled: !!token,
    staleTime: 30_000,
  });
}
