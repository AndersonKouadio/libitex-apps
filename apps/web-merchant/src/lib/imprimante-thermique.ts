"use client";

/**
 * Impression directe sur imprimante thermique 80mm via WebUSB.
 *
 * Pourquoi WebUSB plutot que window.print() :
 * - 0 dialog d'impression : l'envoi est silencieux, vente -> ticket en 0.5s
 * - pas de driver OS necessaire (le browser parle directement a l'USB)
 * - meme code pour Epson, Star, Xprinter (commandes ESC/POS standard)
 *
 * Fallback : si WebUSB non disponible (Safari, Firefox) ou aucune
 * imprimante appairee, l'app retombe sur l'impression HTML existante
 * (window.print sur une popup 80mm).
 *
 * Le device est persiste : Chrome conserve l'appairage entre sessions,
 * et getDevices() permet de le retrouver sans redemander la permission.
 */

import type { ITicket } from "@/features/vente/types/vente.type";
import { formatMontant } from "@/features/vente/utils/format";

// ===== Types WebUSB (le DOM lib ne les inclut pas par defaut) ============

interface USBEndpoint {
  endpointNumber: number;
  direction: "in" | "out";
  type: string;
}
interface USBAlternateInterface { endpoints: USBEndpoint[] }
interface USBInterface { interfaceNumber: number; alternates: USBAlternateInterface[] }
interface USBConfiguration { interfaces: USBInterface[] }
export interface DeviceUSB {
  vendorId: number;
  productId: number;
  serialNumber?: string;
  productName?: string;
  manufacturerName?: string;
  configuration?: USBConfiguration | null;
  configurations: USBConfiguration[];
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(n: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  releaseInterface(n: number): Promise<void>;
  transferOut(endpoint: number, data: Uint8Array): Promise<{ bytesWritten: number }>;
}
interface USB {
  requestDevice(opts: { filters: { vendorId?: number; productId?: number }[] }): Promise<DeviceUSB>;
  getDevices(): Promise<DeviceUSB[]>;
}
declare global {
  interface Navigator { usb?: USB }
}

// ===== Commandes ESC/POS ================================================

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// Table de remapping UTF-8 -> CP858 (multilingue latin avec euro). Couvre
// le francais courant. Caracteres non mappes : remplaces par '?'.
const TABLE_CP858: Record<string, number> = {
  "é": 0x82, "è": 0x8a, "ê": 0x88, "ë": 0x89,
  "à": 0x85, "â": 0x83, "ä": 0x84,
  "ç": 0x87, "î": 0x8c, "ï": 0x8b,
  "ô": 0x93, "ö": 0x94,
  "ù": 0x97, "û": 0x96, "ü": 0x81,
  "ÿ": 0x98,
  "É": 0x90, "À": 0xb7, "Ç": 0x80, "Ê": 0xd2, "È": 0xd4,
  "°": 0xf8, "€": 0xd5, "·": 0xfa,
  "—": 0x2d, "–": 0x2d, "«": 0xae, "»": 0xaf,
  "œ": 0x6f, "Œ": 0x4f,
  " ": 0x20, // nbsp
  " ": 0x20, // narrow nbsp
};

function encoderCP858(s: string): Uint8Array {
  const buf: number[] = [];
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code < 0x80) {
      buf.push(code);
    } else if (TABLE_CP858[ch] !== undefined) {
      buf.push(TABLE_CP858[ch]);
    } else {
      buf.push(0x3f);
    }
  }
  return new Uint8Array(buf);
}

class ConstructeurEscPos {
  private buf: number[] = [];

  init(): this { this.buf.push(ESC, 0x40); return this; }

  // CP858 sur Epson et compatibles ; n=19 sur certaines, n=13 sur d'autres.
  // Le defaut Epson est generalement OK avec 19.
  codePageCp858(): this { this.buf.push(ESC, 0x74, 19); return this; }

  aligner(mode: "gauche" | "centre" | "droite"): this {
    const n = mode === "gauche" ? 0 : mode === "centre" ? 1 : 2;
    this.buf.push(ESC, 0x61, n);
    return this;
  }

  gras(actif: boolean): this { this.buf.push(ESC, 0x45, actif ? 1 : 0); return this; }

  /** n bits : 0x30 = double largeur + double hauteur. */
  taille(n: number): this { this.buf.push(ESC, 0x21, n); return this; }

  texte(s: string): this {
    const bytes = encoderCP858(s);
    for (const b of bytes) this.buf.push(b);
    return this;
  }

  ligne(s = ""): this { this.texte(s); this.buf.push(LF); return this; }

  saut(n = 1): this { for (let i = 0; i < n; i += 1) this.buf.push(LF); return this; }

  /** Coupe le papier (partiel). m=66 = feed puis coupe partielle. */
  couper(): this { this.buf.push(GS, 0x56, 0x42, 0x00); return this; }

  build(): Uint8Array { return new Uint8Array(this.buf); }
}

// ===== Connexion USB =====================================================

const STORAGE_DEVICE = "libitex_imprimante_device";

interface DevicePersiste {
  vendorId: number;
  productId: number;
  serialNumber?: string;
}

function lireDevicePersiste(): DevicePersiste | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_DEVICE);
    return raw ? (JSON.parse(raw) as DevicePersiste) : null;
  } catch { return null; }
}

function ecrireDevicePersiste(d: DevicePersiste | null): void {
  if (typeof window === "undefined") return;
  if (d) localStorage.setItem(STORAGE_DEVICE, JSON.stringify(d));
  else localStorage.removeItem(STORAGE_DEVICE);
}

export function supporteWebUsb(): boolean {
  return typeof navigator !== "undefined" && !!navigator.usb;
}

/**
 * Demande a l'utilisateur de choisir une imprimante USB. Le navigateur
 * memorise l'appairage pour les prochaines sessions.
 */
export async function appairerImprimante(): Promise<DeviceUSB> {
  if (!navigator.usb) throw new Error("WebUSB non supporte par ce navigateur");
  const device = await navigator.usb.requestDevice({ filters: [] });
  ecrireDevicePersiste({
    vendorId: device.vendorId,
    productId: device.productId,
    serialNumber: device.serialNumber,
  });
  return device;
}

/**
 * Retrouve le device deja appaire sans demander de permission. null si
 * aucun device persiste ou si Chrome a perdu l'appairage.
 */
export async function retrouverImprimante(): Promise<DeviceUSB | null> {
  if (!navigator.usb) return null;
  const cible = lireDevicePersiste();
  if (!cible) return null;
  const devices = await navigator.usb.getDevices();
  return devices.find((d) =>
    d.vendorId === cible.vendorId
    && d.productId === cible.productId
    && (cible.serialNumber === undefined || d.serialNumber === cible.serialNumber),
  ) ?? null;
}

export function oublierImprimante(): void {
  ecrireDevicePersiste(null);
}

export function decrireImprimante(d: DeviceUSB): string {
  const parts = [d.manufacturerName, d.productName].filter(Boolean);
  if (parts.length === 0) return `USB ${d.vendorId.toString(16)}:${d.productId.toString(16)}`;
  return parts.join(" ");
}

/**
 * Trouve l'endpoint OUT bulk du device. Sans ca on ne sait pas a quel
 * endpointNumber envoyer.
 */
function trouverEndpointOut(device: DeviceUSB): { config: number; interface: number; endpoint: number } | null {
  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        const ep = alt.endpoints.find((e) => e.direction === "out");
        if (ep) {
          return {
            // selectConfiguration prend l'indice 1-based dans Chrome
            config: 1,
            interface: iface.interfaceNumber,
            endpoint: ep.endpointNumber,
          };
        }
      }
    }
  }
  return null;
}

/**
 * Ouvre, claim, envoie la commande, libere. Robuste aux reouvertures
 * multiples : si deja ouvert, on continue avec.
 */
export async function envoyerCommandes(device: DeviceUSB, data: Uint8Array): Promise<void> {
  const cible = trouverEndpointOut(device);
  if (!cible) throw new Error("Endpoint d'ecriture USB introuvable sur l'imprimante");
  try {
    await device.open();
  } catch {
    // deja ouvert : on poursuit
  }
  if (!device.configuration) {
    await device.selectConfiguration(cible.config);
  }
  try {
    await device.claimInterface(cible.interface);
  } catch {
    // deja claim : on poursuit
  }
  // Decoupage en chunks de 64 bytes pour eviter les transferOut tronques
  // sur certains drivers (Xprinter, GooJPRT...).
  const chunkSize = 64;
  for (let i = 0; i < data.length; i += chunkSize) {
    const slice = data.slice(i, i + chunkSize);
    await device.transferOut(cible.endpoint, slice);
  }
}

// ===== Rendu d'un ticket en ESC/POS =====================================

interface InfosBoutique { nom: string; devise?: string }
interface InfosContexte { caissier?: string; numeroSession?: string }

const LIBELLE_PAIEMENT: Record<string, string> = {
  CASH: "Especes",
  CARD: "Carte bancaire",
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Virement",
  CREDIT: "Credit",
};

// Largeur fixe pour le ticket 80mm : 42 colonnes en font A (12x24).
const COLS = 42;

function ligneFlex(gauche: string, droite: string): string {
  const espaces = Math.max(1, COLS - gauche.length - droite.length);
  return gauche + " ".repeat(espaces) + droite;
}

function trim(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + "…";
}

export function genererTicketEscPos(
  ticket: ITicket,
  boutique: InfosBoutique,
  monnaie: number,
  contexte: InfosContexte,
): Uint8Array {
  const date = new Date(ticket.completeLe ?? ticket.creeLe);
  const dateStr = date.toLocaleDateString("fr-FR");
  const heureStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const devise = boutique.devise ?? "F CFA";
  const sep = "-".repeat(COLS);

  const b = new ConstructeurEscPos()
    .init()
    .codePageCp858()
    .aligner("centre")
    .taille(0x10) // double largeur
    .ligne(trim(boutique.nom, COLS / 2))
    .taille(0x00)
    .ligne(`${dateStr}  ${heureStr}`)
    .ligne(`Ticket ${ticket.numeroTicket}`);

  if (contexte.caissier) b.ligne(`Caissier : ${contexte.caissier}`);
  if (contexte.numeroSession) b.ligne(`Session : ${contexte.numeroSession}`);

  b.aligner("gauche").ligne(sep);

  if (ticket.nomClient || ticket.telephoneClient) {
    const clientLine = `${ticket.nomClient ?? ""}${ticket.telephoneClient ? ` · ${ticket.telephoneClient}` : ""}`;
    b.ligne(`Client : ${trim(clientLine, COLS - 9)}`);
  }
  if (ticket.note) {
    b.ligne(`Note : ${trim(ticket.note, COLS - 7)}`);
  }
  if (ticket.nomClient || ticket.telephoneClient || ticket.note) {
    b.ligne(sep);
  }

  for (const l of ticket.lignes) {
    const nom = l.nomVariante ? `${l.nomProduit} (${l.nomVariante})` : l.nomProduit;
    const total = formatMontant(l.totalLigne);
    b.ligne(ligneFlex(trim(nom, COLS - total.length - 1), total));
    const detail = `  ${l.quantite} x ${formatMontant(l.prixUnitaire)}`;
    b.ligne(detail);
    for (const s of l.supplements ?? []) {
      b.ligne(`  + ${trim(s.nom, COLS - 6)} x${s.quantite}`);
    }
  }

  b.ligne(sep)
    .ligne(ligneFlex("Sous-total", formatMontant(ticket.sousTotal)));

  if (ticket.montantRemise > 0) {
    b.ligne(ligneFlex("Remise", `- ${formatMontant(ticket.montantRemise)}`));
  }
  if (ticket.montantTva > 0) {
    b.ligne(ligneFlex("TVA", formatMontant(ticket.montantTva)));
  }

  b.gras(true)
    .taille(0x10)
    .ligne(ligneFlex("TOTAL", `${formatMontant(ticket.total)}`))
    .taille(0x00)
    .gras(false)
    .ligne(`        ${devise}`)
    .ligne(sep);

  for (const p of ticket.paiements) {
    b.ligne(ligneFlex(LIBELLE_PAIEMENT[p.methode] ?? p.methode, formatMontant(p.montant)));
  }

  if (monnaie > 0) {
    b.gras(true)
      .ligne(ligneFlex("Monnaie rendue", formatMontant(monnaie)))
      .gras(false);
  }

  b.saut(2)
    .aligner("centre")
    .ligne("Merci de votre visite")
    .saut(3)
    .couper();

  return b.build();
}
