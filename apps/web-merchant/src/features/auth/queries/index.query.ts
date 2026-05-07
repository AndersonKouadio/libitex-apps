import { useQueryClient } from "@tanstack/react-query";

export const authKeyQuery = (...params: unknown[]) => ["auth", ...params];

export const useInvalidateAuthQuery = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["auth"] });
};
