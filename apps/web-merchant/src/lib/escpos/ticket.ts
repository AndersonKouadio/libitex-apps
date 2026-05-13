/**
 * Rendu d'un `ITicket` en buffer ESC/POS pour imprimante thermique 80mm.
 *
 * Module pur : depend uniquement du builder ESC/POS et des libelles
 * paiement centralises. Testable depuis Bun/Jest sans navigateur.
 */

import type { ITicket } from "@/features/vente/types/vente.type";
import { formatMontant } from "@/features/vente/utils/format";
import { LABELS_METHODE_PAIEMENT } from "@/features/vente/utils/methode-paiement";
import { ConstructeurEscPos } from "./builder";

export interface InfosBoutique {
  nom: string;
  devise?: string;
}

export interface InfosContexte {
  caissier?: string;
  numeroSession?: string;
  /** Imprime "[OFFLINE]" en entete pour tracer les ventes synchronisees
   *  depuis la file hors-ligne (utile pour le rapprochement comptable). */
  origineOffline?: boolean;
  /**
   * Module 15 D2 : message libre imprime en bas du ticket. Configure
   * par emplacement via /parametres/emplacements/[id]. Max 200 chars
   * (~3-4 lignes 80mm). Tronque silencieusement si plus long.
   */
  footerMessage?: string | null;
}

/**
 * Libelles paiement utilises sur le ticket papier. Reutilise la table
 * centralisee `LABELS_METHODE_PAIEMENT` pour eviter la divergence UI/papier
 * (ex. LOYALTY -> "Points fidelite" partout).
 */
const LIBELLE_PAIEMENT = LABELS_METHODE_PAIEMENT;

/** Largeur en colonnes du ticket 80mm en font A (12x24 pixels). */
const COLS = 42;

/** Aligne `gauche` a gauche et `droite` a droite sur COLS colonnes. */
function ligneFlex(gauche: string, droite: string): string {
  const espaces = Math.max(1, COLS - gauche.length - droite.length);
  return gauche + " ".repeat(espaces) + droite;
}

/** Tronque `s` a `max` caracteres en remplacant la fin par "…" si necessaire. */
function trim(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + "…";
}

/**
 * Construit le buffer ESC/POS du ticket :
 * 1. En-tete : nom boutique (double largeur, centre) + date/heure + numero
 * 2. Contexte : caissier, session, badge [OFFLINE] si applicable
 * 3. Client/Note si presents
 * 4. Lignes du ticket avec supplements
 * 5. Sous-total, remises, TVA
 * 6. TOTAL (gras double largeur)
 * 7. Ventilation paiements + monnaie rendue
 * 8. Pied de page + coupe partielle
 */
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
  if (contexte.origineOffline) {
    // Badge encadre + gras pour ressortir au scan visuel : le caissier
    // doit reperer en 1s qu'un ticket etait offline lors de l'encaissement.
    b.gras(true).ligne("[OFFLINE]").gras(false);
  }

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
    .ligne("Merci de votre visite");

  // Module 15 D2 : message libre par emplacement (footer personnalise).
  // Wrap automatique sur la largeur du ticket. Tronque a 200 chars pour
  // eviter qu'un message trop long ne mange tout le rouleau.
  const footer = (contexte.footerMessage ?? "").trim().slice(0, 200);
  if (footer) {
    b.saut(1);
    // Decoupe en lignes de COLS=42 chars max (sans casser les mots si possible)
    const mots = footer.split(/\s+/);
    let ligne = "";
    for (const mot of mots) {
      if (ligne.length === 0) {
        ligne = mot;
      } else if (ligne.length + 1 + mot.length <= COLS) {
        ligne += " " + mot;
      } else {
        b.ligne(ligne);
        ligne = mot;
      }
    }
    if (ligne.length > 0) b.ligne(ligne);
  }

  b.saut(3).couper();

  return b.build();
}
