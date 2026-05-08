import { useQueryClient } from "@tanstack/react-query";

export const equipeKeyQuery = (...params: unknown[]) => ["equipe", ...params];

export const useInvalidateEquipeQuery = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["equipe"] });
};
