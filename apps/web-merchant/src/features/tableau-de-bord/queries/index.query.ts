import { useQueryClient } from "@tanstack/react-query";

export const tableauDeBordKeyQuery = (...params: unknown[]) => ["tableau-de-bord", ...params];

export const useInvalidateTableauDeBordQuery = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["tableau-de-bord"] });
};
