/**
 * API publique du module ESC/POS.
 *
 * - cp858 / builder / ticket : modules purs, testables sans navigateur
 * - usb : connexion WebUSB, navigateur uniquement ("use client")
 */

export { encoderCP858, TABLE_CP858, OCTET_INCONNU } from "./cp858";
export { ConstructeurEscPos, ESC, GS, LF } from "./builder";
export { genererTicketEscPos } from "./ticket";
export type { InfosBoutique, InfosContexte } from "./ticket";
export {
  supporteWebUsb, appairerImprimante, retrouverImprimante,
  oublierImprimante, decrireImprimante, envoyerCommandes,
  verifierPapier,
} from "./usb";
export type { DeviceUSB, EtatPapier } from "./usb";
