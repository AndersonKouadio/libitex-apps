"use client";

/**
 * Helpers WebRTC pour gerer le flux video d'une camera, le torch (flash)
 * et le switch entre cameras. Centralise les declarations de types
 * etendues (torch n'est pas standard).
 */

/** Capabilities etendue avec torch (pas dans lib.dom.d.ts). */
export type CapsTorch = MediaTrackCapabilities & { torch?: boolean };
/** Constraints etendue avec torch. */
export type ConstraintsTorch = MediaTrackConstraints & { advanced?: Array<{ torch?: boolean }> };

export type FacingMode = "environment" | "user";

/**
 * Vrai si l'API mediaDevices.getUserMedia est disponible. Faux sur :
 * - Chrome < 53
 * - contexte HTTP non-secure (sauf localhost)
 * - certains WebViews mobiles
 */
export function supporteMediaDevices(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Demande un flux video avec une camera (front ou back) selon facingMode.
 * Resolution ideale 1280x720 — l'imprimante de codes-barres demande de
 * la nettete mais pas plus haut (consomme CPU pour rien).
 *
 * Lance une exception si la permission est refusee — le caller doit
 * intercepter et afficher un message.
 */
export async function ouvrirFluxCamera(facingMode: FacingMode): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
}

/**
 * Compte le nombre de cameras disponibles. Permet d'afficher ou non le
 * bouton de switch. Silencieux si enumerateDevices echoue (Safari sans
 * permission preliminaire etc.) — retourne 0 par defaut.
 */
export async function compterCameras(): Promise<number> {
  if (!navigator.mediaDevices?.enumerateDevices) return 0;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput").length;
  } catch {
    return 0;
  }
}

/**
 * Vrai si le track video courant supporte le torch (flash). Sur les
 * cameras qui n'ont pas de flash (laptops, cameras frontales), retourne
 * false.
 */
export function supporteTorch(track: MediaStreamTrack | null): boolean {
  if (!track || typeof track.getCapabilities !== "function") return false;
  const caps = track.getCapabilities() as CapsTorch;
  return Boolean(caps.torch);
}

/**
 * Active/desactive le torch via `applyConstraints`. Retourne `true` si la
 * commande a reussi, `false` sinon. Certains pilotes acceptent torch dans
 * `getCapabilities` mais rejettent `applyConstraints` (cas rare).
 */
export async function basculerTorch(track: MediaStreamTrack, actif: boolean): Promise<boolean> {
  try {
    await track.applyConstraints({ advanced: [{ torch: actif }] } as ConstraintsTorch);
    return true;
  } catch {
    return false;
  }
}

/**
 * Arrete proprement un flux : stop chaque track. A appeler systematiquement
 * au cleanup (unmount, switch camera, fermeture modale).
 */
export function fermerFluxCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}
