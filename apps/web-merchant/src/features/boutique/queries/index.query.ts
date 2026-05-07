import { useQueryClient } from "@tanstack/react-query";

export const boutiqueKeyQuery = (...params: unknown[]) => ["boutique", ...params];

export const useInvalidateBoutiqueQuery = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["boutique"] });
};
