"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { stockAPI } from "../apis/stock.api";
import { useInvalidateStockQuery } from "./index.query";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useAppliquerInventaireMutation() {
  const { token } = useAuth();
  const invalidate = useInvalidateStockQuery();
  return useMutation({
    mutationFn: (data: {
      emplacementId: string; justification: string;
      lignes: Array<{ varianteId: string; quantiteReelle: number }>;
    }) => stockAPI.appliquerInventaire(token!, data),
    onSuccess: (res) => {
      invalidate();
      const a = res.ajustements;
      const i = res.inchanges;
      toast.success(
        a === 0
          ? `Inventaire validé — aucun écart sur ${i} ligne${i > 1 ? "s" : ""} comptée${i > 1 ? "s" : ""}`
          : `Inventaire validé — ${a} ajustement${a > 1 ? "s" : ""}, ${i} ligne${i > 1 ? "s" : ""} sans écart`,
      );
    },
    onError: (err: Error) => toast.danger(err.message || "Erreur lors de l'inventaire"),
  });
}
