import { useQueryClient } from "@tanstack/react-query";

export const supplementKeyQuery = (...params: unknown[]) => ["supplement", ...params];

/**
 * Invalide les caches supplement ET catalogue : depuis la refonte, les
 * supplements sont stockes en table products avec isSupplement=true ; toute
 * modification via les endpoints supplements affecte aussi le cache produits
 * (ex: la liste de la page /catalogue qui filtre isSupplement=false).
 */
export const useInvalidateSupplementQuery = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["supplement"] });
    queryClient.invalidateQueries({ queryKey: ["catalogue"] });
  };
};
