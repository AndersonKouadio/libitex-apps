"use client";

import { useMutation } from "@tanstack/react-query";
import { authAPI } from "../apis/auth.api";
import type { ConnexionDTO } from "../schemas/auth.schema";

export function useConnexionMutation() {
  return useMutation({
    mutationFn: (data: ConnexionDTO) => authAPI.connecter(data),
  });
}
