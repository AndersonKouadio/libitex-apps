/**
 * Facade de compatibilite vers le module split `lib/escpos/`.
 *
 * Garde les anciens imports `@/lib/imprimante-thermique` fonctionnels.
 * Pour les nouveaux call-sites, importer directement depuis `@/lib/escpos`.
 */

export {
  encoderCP858,
  TABLE_CP858,
  OCTET_INCONNU,
  ConstructeurEscPos,
  ESC, GS, LF,
  genererTicketEscPos,
  supporteWebUsb,
  appairerImprimante,
  retrouverImprimante,
  oublierImprimante,
  decrireImprimante,
  envoyerCommandes,
} from "./escpos";

export type { DeviceUSB, InfosBoutique, InfosContexte } from "./escpos";
