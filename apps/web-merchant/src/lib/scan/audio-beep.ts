"use client";

/**
 * Bip de confirmation au scan (1 sinusoide 880Hz pendant 120ms).
 *
 * Fix C5 : AudioContext singleton (lazy-created au premier scan), reutilise
 * pour tous les scans suivants. Sans ca, Safari iOS crashe apres ~6
 * AudioContext crees (limite navigateur). On ne close jamais le ctx :
 * c'est leger en RAM et reactiver Web Audio coute plus cher.
 */

let audioCtxSingleton: AudioContext | null = null;

/**
 * Joue un bip court. Silencieux si Web Audio n'est pas dispo (no-op).
 *
 * @param frequence Hz (defaut 880 = un La aigu, distinct des autres sons UI)
 * @param dureeMs Duree en millisecondes (defaut 120ms = perception "ding")
 */
export function bipScanReussi(frequence = 880, dureeMs = 120): void {
  try {
    if (!audioCtxSingleton) {
      const AC = window.AudioContext
        ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      audioCtxSingleton = new AC();
    }
    const ctx = audioCtxSingleton;
    // Si le ctx a ete suspendu (autoplay policy), le reveiller. C'est safe
    // meme si deja actif (resume() est no-op).
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequence;
    osc.type = "sine";
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dureeMs / 1000);
  } catch {
    /* silencieux : le scan reussit meme sans son */
  }
}
