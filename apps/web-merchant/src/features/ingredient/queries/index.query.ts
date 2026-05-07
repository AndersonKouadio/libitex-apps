import { useQueryClient } from "@tanstack/react-query";

export const ingredientKeyQuery = (...params: unknown[]) => ["ingredient", ...params];

export const useInvalidateIngredientQuery = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["ingredient"] });
};
