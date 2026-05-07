"use client";

import { type ReactNode } from "react";
import { AuthContext, useAuthState } from "@/features/auth/hooks/useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}
