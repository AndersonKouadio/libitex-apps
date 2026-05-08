import { useQueryClient } from "@tanstack/react-query";

export const clientKeyQuery = (...params: unknown[]) => ["client", ...params];

export const useInvalidateClientQuery = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["client"] });
};
