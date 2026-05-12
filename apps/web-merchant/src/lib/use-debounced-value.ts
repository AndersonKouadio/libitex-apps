"use client";

import { useEffect, useState } from "react";

/**
 * Debounce une valeur reactive : retourne `value` apres qu'elle soit stable
 * pendant `delayMs`. Evite de declencher des refetch a chaque keystroke
 * sur une recherche live (3G lente, rate-limit API).
 *
 * Usage :
 *   const [recherche, setRecherche] = useState("");
 *   const rechercheDebounced = useDebouncedValue(recherche, 300);
 *   const { data } = useQuery({ queryKey: [..., rechercheDebounced], ... });
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
