import { useQueryClient } from "@tanstack/react-query";

export const catalogueKeyQuery = (...params: unknown[]) => ["catalogue", ...params];

export const useInvalidateCatalogueQuery = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["catalogue"] });
};
