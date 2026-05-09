import { useQueryClient } from "@tanstack/react-query";

export const sessionCaisseKeyQuery = (...params: unknown[]) => ["session-caisse", ...params];

/**
 * Invalide tout le cache session-caisse + vente + tableau-de-bord.
 * Une mutation sur une session impacte les KPIs (recettes, tickets) et
 * la liste des tickets, donc on rafraichit tout le bloc.
 */
export const useInvalidateSessionCaisseQuery = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["session-caisse"] });
    queryClient.invalidateQueries({ queryKey: ["vente"] });
    queryClient.invalidateQueries({ queryKey: ["tableau-de-bord"] });
  };
};
