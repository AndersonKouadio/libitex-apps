import { useQueryClient } from "@tanstack/react-query";

export const stockKeyQuery = (...params: unknown[]) => ["stock", ...params];

export const useInvalidateStockQuery = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["stock"] });
};
