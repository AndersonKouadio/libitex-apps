/**
 * Source unique des cles localStorage utilisees par l'app. Centralise
 * pour eviter les duplications (auth token utilise dans useAuth.ts + http.ts
 * + changer-mot-de-passe.mutation.ts -> 3 endroits a sync si on renomme).
 *
 * Convention : prefix `libitex_` pour le namespace, snake_case.
 */
export const STORAGE_KEYS = {
  // Auth
  AUTH_TOKEN: "libitex_token",
  AUTH_REFRESH: "libitex_refresh",
  AUTH_USER: "libitex_user",
  AUTH_BOUTIQUES: "libitex_boutiques",
  AUTH_BOUTIQUE_ACTIVE: "libitex_boutique_active",

  // UI prefs
  THEME: "libitex_theme",

  // POS prefs + offline
  POS_PREFS: "libitex_prefs_pos",
  POS_OFFLINE_QUEUE: "libitex_offline_queue",
  POS_PRINTER_DEVICE: "libitex_imprimante_device",

  // Onboarding
  ONBOARDING_DISMISSED: "libitex.onboarding.dismissed",
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
