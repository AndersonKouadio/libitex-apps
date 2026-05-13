"use client";

/**
 * Module 13 D2 : connexion Web Bluetooth a une imprimante thermique
 * ESC/POS. Cible : imprimantes mobiles type MUNBYN, Xprinter BT, GooJPRT
 * PT-280, courantes sur les camions ambulants et stands de marche.
 *
 * Difference avec usb.ts :
 * - L'utilisateur appaire la machine via BLE (pas via cable USB)
 * - Le service BLE et la characteristic dependent du modele
 *   (impossible de standardiser comme WebUSB) — on cherche le service
 *   ESC/POS standard 0x18F0 ou la characteristic "write" si trouvee
 * - Pas de "getDevices()" en Web Bluetooth sans permission Persistent
 *   (Chrome flag), donc on persiste juste le nom du device pour le
 *   reaffichage et on redemande l'appairage a chaque rechargement
 *
 * Limitations :
 * - Chrome desktop + Android uniquement (pas de iOS Safari)
 * - Pas de status papier (les imprimantes BT supportent rarement)
 * - Throughput plus faible que USB (~1KB/s) -> impression un peu plus lente
 */

import { STORAGE_KEYS } from "../storage-keys";

// ===== Types Web Bluetooth (DOM lib partiel) =============================

export interface DeviceBluetooth {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}
interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: string | number): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}
interface BluetoothRemoteGATTService {
  uuid: string;
  getCharacteristic(uuid: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}
export interface BluetoothRemoteGATTCharacteristic {
  uuid: string;
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}
interface BluetoothRequestDeviceOptions {
  filters?: Array<{ services?: (string | number)[]; namePrefix?: string }>;
  optionalServices?: (string | number)[];
  acceptAllDevices?: boolean;
}
interface Bluetooth {
  requestDevice(opts: BluetoothRequestDeviceOptions): Promise<DeviceBluetooth>;
}
declare global {
  interface Navigator { bluetooth?: Bluetooth }
}

// ===== Services BLE imprimantes thermiques ===============================

/**
 * Services BLE connus pour les imprimantes thermiques 80mm. La plupart
 * exposent un service "vendor-specific" en 18F0 (standard de facto).
 * Les autres modeles (Bixolon, certains Star) utilisent leur propre UUID.
 *
 * Pour debloquer les modeles inconnus, on inclut "Serial Port Profile"
 * (SPP) sous BLE en optional, et l'utilisateur peut activer le "mode
 * avance" pour lever tous les filtres.
 */
const SERVICE_THERMIQUE_STANDARD = 0x18f0; // service "vendor-specific" courant
const SERVICE_SPP_BLE = "00001101-0000-1000-8000-00805f9b34fb"; // SPP, fallback
const SERVICES_OPTIONNELS: (string | number)[] = [
  SERVICE_THERMIQUE_STANDARD,
  SERVICE_SPP_BLE,
  // Autres services "vendor-specific" frequents
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC Tech (Microchip)
  "0000ff00-0000-1000-8000-00805f9b34fb", // generic FF00
];

// ===== Persistance =======================================================

const STORAGE_DEVICE = STORAGE_KEYS.POS_PRINTER_BT;

interface DevicePersisteBT {
  id: string;
  name?: string;
}

function lireDevicePersiste(): DevicePersisteBT | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_DEVICE);
    return raw ? (JSON.parse(raw) as DevicePersisteBT) : null;
  } catch { return null; }
}

function ecrireDevicePersiste(d: DevicePersisteBT | null): void {
  if (typeof window === "undefined") return;
  if (d) localStorage.setItem(STORAGE_DEVICE, JSON.stringify(d));
  else localStorage.removeItem(STORAGE_DEVICE);
}

// ===== API publique ======================================================

export function supporteWebBluetooth(): boolean {
  return typeof navigator !== "undefined" && !!navigator.bluetooth;
}

/**
 * Demande a l'utilisateur de selectionner une imprimante BLE. Le navigateur
 * presente la liste des devices a portee. Pas de filtre dur (les imprimantes
 * BT thermiques annoncent des services tres varies selon le constructeur),
 * juste un namePrefix optionnel pour reduire le bruit.
 */
export async function appairerImprimanteBT(modeAvance = false): Promise<DeviceBluetooth> {
  if (!navigator.bluetooth) throw new Error("Web Bluetooth non supporte par ce navigateur");

  const opts: BluetoothRequestDeviceOptions = modeAvance
    ? { acceptAllDevices: true, optionalServices: SERVICES_OPTIONNELS }
    : {
        // Heuristique : la plupart des imprimantes BT annoncent un nom
        // commencant par MTP, MPT, MUNBYN, BlueTooth Printer, SPP, etc.
        filters: [
          { namePrefix: "MTP" },
          { namePrefix: "MPT" },
          { namePrefix: "MUNBYN" },
          { namePrefix: "BlueTooth Printer" },
          { namePrefix: "Printer" },
          { namePrefix: "SPP" },
          { namePrefix: "PT-" },
          { namePrefix: "RPP" },     // Rongta
          { namePrefix: "HOIN" },
          { namePrefix: "Bisofice" },
          { namePrefix: "GOOJPRT" },
          { namePrefix: "XP-" },     // Xprinter
        ],
        optionalServices: SERVICES_OPTIONNELS,
      };

  const device = await navigator.bluetooth.requestDevice(opts);
  ecrireDevicePersiste({ id: device.id, name: device.name });
  return device;
}

export function oublierImprimanteBT(): void {
  ecrireDevicePersiste(null);
}

export function nomDeviceBT(): string | null {
  const d = lireDevicePersiste();
  return d?.name ?? null;
}

/** Indique si un appairage BT a deja ete fait dans cette session navigateur. */
export function imprimanteBTConnue(): boolean {
  return lireDevicePersiste() !== null;
}

export function decrireImprimanteBT(d: DeviceBluetooth): string {
  return d.name ?? `Bluetooth ${d.id.slice(0, 8)}`;
}

// ===== Transfert ESC/POS via BLE =========================================

/**
 * Trouve une characteristic ecrivable (write ou writeWithoutResponse) sur
 * les services connus. Strategie :
 * 1. Essayer les services prevus dans la liste
 * 2. Sur le 1er service trouve, prendre la premiere characteristic
 *    avec write|writeWithoutResponse
 *
 * Renvoie null si aucune characteristic ecrivable n'est trouvee.
 */
async function trouverCharacteristic(
  device: DeviceBluetooth,
): Promise<BluetoothRemoteGATTCharacteristic | null> {
  if (!device.gatt) return null;
  if (!device.gatt.connected) await device.gatt.connect();

  // 1. Essayer les services connus dans l'ordre
  for (const uuid of SERVICES_OPTIONNELS) {
    try {
      const service = await device.gatt.getPrimaryService(uuid);
      const chars = await service.getCharacteristics();
      const writable = chars.find(
        (c) => c.properties.write || c.properties.writeWithoutResponse,
      );
      if (writable) return writable;
    } catch {
      // service indisponible sur ce device → on continue
    }
  }

  // 2. Fallback : scanner tous les services et prendre la 1ere characteristic ecrivable
  try {
    const services = await device.gatt.getPrimaryServices();
    for (const service of services) {
      const chars = await service.getCharacteristics();
      const writable = chars.find(
        (c) => c.properties.write || c.properties.writeWithoutResponse,
      );
      if (writable) return writable;
    }
  } catch {
    // pas de permission de scanner all -> echec silencieux
  }

  return null;
}

const TAILLE_CHUNK_BLE = 200; // BLE MTU classique = 23 octets, mais la plupart
                              // des imprimantes acceptent jusqu'a 200 par paquet

/**
 * Envoie les commandes ESC/POS a l'imprimante BLE. Chunked car BLE a un
 * MTU faible et la plupart des imprimantes attendent des paquets de
 * 100-200 octets max.
 *
 * Choisit writeWithoutResponse si dispo (plus rapide, ~3x), fallback
 * write classique.
 */
export async function envoyerCommandesBT(
  device: DeviceBluetooth, data: Uint8Array,
): Promise<void> {
  const characteristic = await trouverCharacteristic(device);
  if (!characteristic) {
    throw new Error(
      "Aucune characteristic d'ecriture trouvee sur cette imprimante. "
      + "Verifiez qu'elle est compatible ESC/POS BLE.",
    );
  }

  const sansReponse = characteristic.properties.writeWithoutResponse;
  for (let i = 0; i < data.length; i += TAILLE_CHUNK_BLE) {
    const slice = data.slice(i, i + TAILLE_CHUNK_BLE);
    if (sansReponse) {
      await characteristic.writeValueWithoutResponse(slice);
    } else {
      await characteristic.writeValue(slice);
    }
  }
}
