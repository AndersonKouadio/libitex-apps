import { useQueryClient } from "@tanstack/react-query";

export const venteKeyQuery = (...params: unknown[]) => ["vente", ...params];

/**
 * Invalide le cache vente ET tableau-de-bord : les KPIs (recettes jour,
 * tickets jour, ticket moyen) sont derives des tickets, donc tout changement
 * sur un ticket doit refresh ces stats.
 */
export const useInvalidateVenteQuery = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["vente"] });
    queryClient.invalidateQueries({ queryKey: ["tableau-de-bord"] });
  };
};
