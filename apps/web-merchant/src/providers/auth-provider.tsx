"use client";

import { useEffect, type ReactNode } from "react";
import { AuthContext, useAuthState } from "@/features/auth/hooks/useAuth";
import { onTokenRefreshed } from "@/lib/http";

export function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useAuthState();
  const { rafraichirTokenLocal } = authState;

  // Quand le httpClient refresh transparent (en cas de 401), il notifie via
  // onTokenRefreshed pour qu'on synchronise notre state React. Sinon
  // useAuth().token resterait sur l'ancien et les prochaines requetes
  // ferait un nouveau refresh inutile.
  useEffect(() => {
    return onTokenRefreshed((accessToken, refreshToken) => {
      rafraichirTokenLocal(accessToken, refreshToken);
    });
  }, [rafraichirTokenLocal]);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}
