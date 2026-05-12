/**
 * Helper pour creer un store global a base de listeners pub/sub.
 * Pattern duplique dans network-status.ts, file-attente-offline.ts,
 * theme.ts, preferences-pos.ts, http.ts -> factorise ici.
 *
 * Usage type :
 *   const monStore = createListenerSet<MaValeur>();
 *   monStore.subscribe(listener) -> renvoie une fonction de cleanup
 *   monStore.emit(valeur) -> notifie tous les listeners
 *
 * Le store ne stocke PAS la valeur — c'est aux modules consommateurs
 * de garder leur state. Le store ne fait que la diffusion.
 */
export interface ListenerSet<T> {
  subscribe: (listener: (value: T) => void) => () => void;
  emit: (value: T) => void;
  /** Nombre de listeners actifs (debug). */
  size: () => number;
}

export function createListenerSet<T>(): ListenerSet<T> {
  const listeners = new Set<(value: T) => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(value) {
      for (const l of listeners) l(value);
    },
    size() {
      return listeners.size;
    },
  };
}
