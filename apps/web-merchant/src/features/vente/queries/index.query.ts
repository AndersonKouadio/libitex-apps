import { useQueryClient } from "@tanstack/react-query";

export const venteKeyQuery = (...params: unknown[]) => ["vente", ...params];

export const useInvalidateVenteQuery = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["vente"] });
};
