"use client";

/**
 * Connexion WebUSB a une imprimante thermique ESC/POS.
 *
 * Pourquoi WebUSB plutot que window.print() :
 * - 0 dialog d'impression : l'envoi est silencieux, vente -> ticket en ~0.5s
 * - pas de driver OS necessaire (le browser parle directement a l'USB)
 * - meme code pour Epson, Star, Xprinter, GooJPRT (commandes ESC/POS standard)
 *
 * Le device est persiste : Chrome conserve l'appairage entre sessions,
 * et `getDevices()` permet de le retrouver sans redemander la permission.
 *
 * Module navigateur uniquement ("use client") : depend de `navigator.usb`
 * et `localStorage`.
 */

import { STORAGE_KEYS } from "../storage-keys";

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
  transferIn(endpoint: number, length: number): Promise<{ data?: DataView; status: string }>;
}
interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
  serialNumber?: string;
}
interface USB {
  requestDevice(opts: { filters: USBDeviceFilter[] }): Promise<DeviceUSB>;
  getDevices(): Promise<DeviceUSB[]>;
}
declare global {
  interface Navigator { usb?: USB }
}

// ===== Persistance de l'appairage ========================================

const STORAGE_DEVICE = STORAGE_KEYS.POS_PRINTER_DEVICE;

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

// ===== Filtre USB lors de l'appairage ====================================

/**
 * VendorIds de fabricants d'imprimantes thermiques les plus courants.
 * Filtre la fenetre de selection USB du navigateur pour eviter d'afficher
 * webcams, claviers, manettes... et reduire le risque qu'un caissier
 * appaire un device qui n'est pas une imprimante (fix C3).
 *
 * Sources : USB-IF vendor IDs publics. La liste est volontairement large
 * (couvre Epson, Star, Citizen, Bixolon, SNBC/Beiyang, Xprinter/GooJPRT,
 * Munbyn, Rongta, HPRT...). Si une marque manque, l'utilisateur peut
 * cocher "Mode avance" pour passer outre.
 */
const VENDOR_IDS_IMPRIMANTES = [
  0x04b8, // Epson / Seiko Epson
  0x0519, // Star Micronics
  0x1504, // Bixolon (anciens modeles)
  0x1fc9, // NXP / certaines reetiquettes
  0x1659, // Citizen
  0x0dd4, // Custom Engineering
  0x0fe6, // SNBC / Beiyang
  0x0416, // Winbond / Xprinter (variantes)
  0x28e9, // GD32 / GooJPRT bas de gamme
  0x6868, // Xprinter generique
  0x0483, // STMicro (Rongta, HPRT clones)
  0x067b, // Prolific (cables RS232-USB pour imprimantes)
  0x154f, // SNBC
  0x0fe7, // SNBC
  0x20d1, // Rongta
  0x1d4d, // HPRT
  0x1a86, // QinHeng (Munbyn, MUYIN)
];

/** Classe USB 7 = Printer (USB-IF). Filtre additionnel a vendorId. */
const USB_CLASS_PRINTER = 7;

// ===== API publique ======================================================

export function supporteWebUsb(): boolean {
  return typeof navigator !== "undefined" && !!navigator.usb;
}

/**
 * Demande a l'utilisateur de choisir une imprimante USB. Le navigateur
 * memorise l'appairage pour les prochaines sessions.
 *
 * En mode standard, on filtre sur la classe USB "Printer" (7) + une
 * liste blanche de vendorIds connus pour eviter qu'un caissier appaire
 * une webcam par erreur (fix C3). En mode avance, aucun filtre : tout
 * device USB connecte sera propose.
 */
export async function appairerImprimante(modeAvance = false): Promise<DeviceUSB> {
  if (!navigator.usb) throw new Error("WebUSB non supporte par ce navigateur");
  const filters = modeAvance
    ? []
    : [
        // Classe USB 7 = Printer (couvre Epson, Star, Citizen...)
        { classCode: USB_CLASS_PRINTER },
        // VendorIds connus en complement (certaines imprimantes chinoises
        // declarent classCode=0 et sont reconnues via le vendorId seul).
        ...VENDOR_IDS_IMPRIMANTES.map((vendorId) => ({ vendorId })),
      ];
  const device = await navigator.usb.requestDevice({ filters });
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

// ===== Transfert ESC/POS =================================================

/**
 * Trouve les endpoints OUT (obligatoire) et IN (optionnel, pour lire le
 * statut). Sans OUT on ne peut pas imprimer. Sans IN on ne peut pas lire
 * le statut papier mais on peut quand meme imprimer.
 */
function trouverEndpoints(device: DeviceUSB): { config: number; interface: number; out: number; in: number | null } | null {
  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        const epOut = alt.endpoints.find((e) => e.direction === "out");
        if (!epOut) continue;
        const epIn = alt.endpoints.find((e) => e.direction === "in");
        return {
          // selectConfiguration prend l'indice 1-based dans Chrome
          config: 1,
          interface: iface.interfaceNumber,
          out: epOut.endpointNumber,
          in: epIn ? epIn.endpointNumber : null,
        };
      }
    }
  }
  return null;
}

/** Timeout d'un transferOut en ms. Au-dela : l'imprimante est bloquee
 *  (papier, capot, USB sature). On rejette pour declencher le fallback. */
const TIMEOUT_TRANSFER_MS = 5000;

/**
 * Wrap une Promise avec un timeout. Si la promesse ne resout pas dans
 * `ms`, on rejette avec une erreur explicite. Fix C2 : evite le freeze
 * indefini si l'imprimante hang (papier, capot, USB sature).
 */
function avecTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Ouvre, claim, envoie la commande, libere. Robuste aux reouvertures
 * multiples : si deja ouvert, on continue avec.
 *
 * Fix C1 : releaseInterface() dans un finally pour relacher l'interface
 * meme en cas d'erreur. Sans ca, une erreur USB laisse l'interface
 * locked et la prochaine impression echoue avec "device busy".
 *
 * Fix C2 : timeout de 5s sur chaque transferOut pour eviter le freeze
 * si l'imprimante hang (papier coince, capot ouvert, USB sature).
 */
export async function envoyerCommandes(device: DeviceUSB, data: Uint8Array): Promise<void> {
  const cible = trouverEndpoints(device);
  if (!cible) throw new Error("Endpoint d'ecriture USB introuvable sur l'imprimante");
  try {
    await device.open();
  } catch {
    // deja ouvert : on poursuit
  }
  if (!device.configuration) {
    await device.selectConfiguration(cible.config);
  }
  let claimed = false;
  try {
    await device.claimInterface(cible.interface);
    claimed = true;
  } catch {
    // deja claim : on poursuit sans tenter de release (autre tab)
  }
  try {
    // Decoupage en chunks de 64 bytes pour eviter les transferOut tronques
    // sur certains drivers (Xprinter, GooJPRT...).
    const chunkSize = 64;
    for (let i = 0; i < data.length; i += chunkSize) {
      const slice = data.slice(i, i + chunkSize);
      await avecTimeout(
        device.transferOut(cible.out, slice),
        TIMEOUT_TRANSFER_MS,
        "L'imprimante ne repond pas (verifier papier, capot, cable USB)",
      );
    }
  } finally {
    if (claimed) {
      try {
        await device.releaseInterface(cible.interface);
      } catch {
        // libre quand meme : pas critique
      }
    }
  }
}

/**
 * Etat papier rapporte par l'imprimante via la commande ESC/POS
 * `GS r 1` (Real-time status request). Le bit 2 du retour indique
 * "paper-end sensor" (papier epuise), bit 3 "paper-near-end" (bientot
 * epuise).
 */
export interface EtatPapier {
  /** Le rouleau est vide ou tres proche du capot. Bloque l'impression. */
  vide: boolean;
  /** Le rouleau approche de la fin (warning, pas bloquant). */
  presqueVide: boolean;
}

/**
 * Demande le statut papier a l'imprimante (GS r 1). Renvoie null si :
 * - l'imprimante n'expose pas d'endpoint IN (cas frequent sur clones)
 * - l'imprimante ne repond pas dans le timeout (1s, plus court qu'un
 *   transferOut car la reponse doit etre instantanee)
 * - une erreur USB se produit (autre tab, deconnexion...)
 *
 * Si vide=true, le caller DOIT afficher un message et empecher l'envoi.
 * Si presqueVide=true, le caller doit prevenir le caissier sans bloquer.
 *
 * Module bonus : pas tous les drivers ESC/POS implementent ce status,
 * d'ou le no-throw : on tente, on degrade silencieusement.
 */
export async function verifierPapier(device: DeviceUSB): Promise<EtatPapier | null> {
  const cible = trouverEndpoints(device);
  if (!cible || cible.in === null) return null;
  try {
    await device.open();
  } catch {
    // deja ouvert
  }
  if (!device.configuration) {
    try { await device.selectConfiguration(cible.config); } catch { return null; }
  }
  let claimed = false;
  try {
    await device.claimInterface(cible.interface);
    claimed = true;
  } catch {
    // deja claim
  }
  try {
    // GS r 1 : real-time status, n=1 = paper sensor
    await avecTimeout(
      device.transferOut(cible.out, new Uint8Array([0x1d, 0x72, 0x01])),
      1000,
      "Pas de reponse statut papier",
    );
    const res = await avecTimeout(
      device.transferIn(cible.in, 1),
      1000,
      "Pas de reponse statut papier",
    );
    if (!res.data || res.data.byteLength === 0) return null;
    const byte = res.data.getUint8(0);
    return {
      vide: (byte & 0x60) !== 0,        // bits 5+6 : paper-end
      presqueVide: (byte & 0x0c) !== 0, // bits 2+3 : near-end
    };
  } catch {
    // Toute erreur (timeout, non supporte...) : on dit "inconnu"
    return null;
  } finally {
    if (claimed) {
      try { await device.releaseInterface(cible.interface); } catch {}
    }
  }
}
