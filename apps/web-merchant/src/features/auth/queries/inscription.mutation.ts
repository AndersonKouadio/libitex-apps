"use client";

import { useMutation } from "@tanstack/react-query";
import { authAPI } from "../apis/auth.api";
import type { InscriptionDTO } from "../schemas/auth.schema";

export function useInscriptionMutation() {
  return useMutation({
    mutationFn: (data: InscriptionDTO) => authAPI.inscrire(data),
  });
}
