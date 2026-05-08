import { useQueryClient } from "@tanstack/react-query";

export const supplementKeyQuery = (...params: unknown[]) => ["supplement", ...params];

export const useInvalidateSupplementQuery = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["supplement"] });
};
