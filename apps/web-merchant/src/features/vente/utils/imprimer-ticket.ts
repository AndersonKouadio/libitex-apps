import * as Sentry from "@sentry/browser";
import type { ITicket } from "../types/vente.type";
import { formatMontant } from "./format";
import { LABELS_METHODE_PAIEMENT } from "./methode-paiement";
import { formaterQuantite } from "@/features/unite/types/unite.type";
import type { UniteMesure } from "@/features/unite/types/unite.type";
import {
  retrouverImprimante, envoyerCommandes, genererTicketEscPos, supporteWebUsb,
  verifierPapier,
} from "@/lib/escpos";

interface InfosBoutique {
  nom: string;
  devise?: string;
}

interface InfosContexte {
  /** Nom complet du caissier (Anderson Kouadio). */
  caissier?: string;
  /** Numero de session caisse pour la tracabilite (SC-20260509-001). */
  numeroSession?: string;
  /** Vrai si le ticket vient de la file hors-ligne (synchronise apres
   *  retour reseau). Imprime "[OFFLINE]" en entete du ticket pour
   *  tracabilite comptable. */
  origineOffline?: boolean;
}

/**
 * Mode d'impression utilise par `imprimerTicket`. Permet aux callers
 * d'afficher un toast contextuel ("Imprimante non detectee, ticket
 * ouvert dans le navigateur") ou de signaler une erreur.
 */
export type ModeImpression = "USB" | "HTML" | "ERREUR";

export interface ResultatImpression {
  mode: ModeImpression;
  /** Vrai si on a bascule USB -> HTML suite a une erreur device.
   *  Permet de prevenir le caissier que la prochaine impression risque
   *  de re-echouer (cable, papier, capot). */
  fallback: boolean;
  /** Message court a afficher (null si tout s'est bien passe). */
  message?: string;
}

/** Fix I4 : reutilise la table centralisee pour eviter la divergence
 *  (UI/HTML/ESC-POS doivent dire la meme chose pour CASH, LOYALTY...). */
const LIBELLE_PAIEMENT = LABELS_METHODE_PAIEMENT;

/**
 * Imprime un ticket. Strategie :
 * 1) Si WebUSB supporte ET imprimante thermique appairee : envoi direct
 *    ESC/POS, sans dialog, ~0.5s. Renvoie {mode: "USB"}.
 * 2) Pas d'imprimante appairee : fallback popup HTML 80mm + window.print().
 *    Renvoie {mode: "HTML", fallback: false}.
 * 3) Erreur USB (cable debranche, papier, timeout...) : capture Sentry +
 *    bascule popup HTML. Renvoie {mode: "HTML", fallback: true, message}.
 * 4) Echec total (popup bloquee ET pas de fallback) : {mode: "ERREUR"}.
 *
 * Le caller peut afficher un toast contextuel selon `mode` + `fallback`.
 */
export async function imprimerTicket(
  ticket: ITicket,
  boutique: InfosBoutique,
  monnaie = 0,
  contexte: InfosContexte = {},
): Promise<ResultatImpression> {
  if (supporteWebUsb()) {
    try {
      const device = await retrouverImprimante();
      if (device) {
        // Verifie le papier AVANT d'envoyer pour eviter d'imprimer
        // dans le vide. Si l'imprimante ne supporte pas le statut (null),
        // on continue sans bloquer.
        const etat = await verifierPapier(device);
        if (etat?.vide) {
          throw new Error("Rouleau de papier epuise — remplacez le rouleau avant de continuer");
        }
        const data = genererTicketEscPos(ticket, boutique, monnaie, contexte);
        await envoyerCommandes(device, data);
        return { mode: "USB", fallback: false };
      }
    } catch (err) {
      // L'erreur USB n'est pas bloquante : on retombe sur la popup HTML
      // pour que le caissier ait quand meme son ticket. On capture sur
      // Sentry pour suivre le taux d'echec en prod.
      const message = err instanceof Error ? err.message : String(err);
      Sentry.captureException(err instanceof Error ? err : new Error(message), {
        tags: { module: "impression", mode: "usb-fallback" },
        extra: {
          ticketId: ticket.id,
          numeroTicket: ticket.numeroTicket,
          origineOffline: contexte.origineOffline ?? false,
        },
      });
      imprimerViaPopup(ticket, boutique, monnaie, contexte);
      return { mode: "HTML", fallback: true, message };
    }
  }
  imprimerViaPopup(ticket, boutique, monnaie, contexte);
  return { mode: "HTML", fallback: false };
}

function imprimerViaPopup(
  ticket: ITicket,
  boutique: InfosBoutique,
  monnaie: number,
  contexte: InfosContexte,
): void {
  const html = construireHtml(ticket, boutique, monnaie, contexte);
  const fenetre = window.open("", "_blank", "width=380,height=600");
  if (!fenetre) {
    // Bloqueur de popup actif — fallback : impression dans la fenêtre courante.
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    return;
  }
  fenetre.document.open();
  fenetre.document.write(html);
  fenetre.document.close();
  fenetre.focus();
  // Laisser au navigateur le temps de rendre avant d'ouvrir le dialogue d'impression.
  setTimeout(() => {
    fenetre.print();
  }, 200);
}

function construireHtml(
  ticket: ITicket,
  boutique: InfosBoutique,
  monnaie: number,
  contexte: InfosContexte,
): string {
  const date = new Date(ticket.completeLe ?? ticket.creeLe);
  const dateStr = date.toLocaleDateString("fr-FR");
  const heureStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const devise = boutique.devise ?? "F CFA";

  const aClient = !!(ticket.nomClient || ticket.telephoneClient);
  const aNote = !!ticket.note;
  const blocClientNote = aClient || aNote
    ? `<div class="bloc-meta">
        ${aClient ? `<div><strong>Client :</strong> ${echapperHtml(ticket.nomClient ?? "")}${
          ticket.telephoneClient ? ` · ${echapperHtml(ticket.telephoneClient)}` : ""
        }</div>` : ""}
        ${aNote ? `<div><strong>Note :</strong> ${echapperHtml(ticket.note!)}</div>` : ""}
      </div>
      <div class="separateur"></div>`
    : "";

  const lignesHtml = ticket.lignes
    .map((l) => {
      const qte = l.uniteVente
        ? formaterQuantite(l.quantite, l.uniteVente as UniteMesure)
        : String(l.quantite);
      const supplementsHtml = (l.supplements ?? []).length > 0
        ? `<div class="supplements">${(l.supplements ?? [])
            .map((s) => `+ ${echapperHtml(s.nom)} ×${s.quantite} (${formatMontant(s.prixUnitaire * s.quantite)})`)
            .join("<br>")}</div>`
        : "";
      return `
        <tr class="ligne">
          <td class="nom">
            ${echapperHtml(l.nomProduit)}
            ${l.nomVariante ? `<div class="variante">${echapperHtml(l.nomVariante)}</div>` : ""}
            <div class="qte-prix">${qte} × ${formatMontant(l.prixUnitaire)}</div>
            ${supplementsHtml}
          </td>
          <td class="total">${formatMontant(l.totalLigne)}</td>
        </tr>`;
    })
    .join("");

  const paiementsHtml = ticket.paiements
    .map(
      (p) => `
        <div class="ligne-flex">
          <span>${echapperHtml(LIBELLE_PAIEMENT[p.methode] ?? p.methode)}</span>
          <span>${formatMontant(p.montant)}</span>
        </div>`,
    )
    .join("");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Ticket ${echapperHtml(ticket.numeroTicket)}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 12px;
      color: #000;
      margin: 0;
      padding: 8px;
      width: 72mm;
    }
    .header { text-align: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #000; }
    .header h1 { font-size: 16px; margin: 0 0 2px; }
    .meta { font-size: 11px; color: #333; }
    .badge-offline { display: inline-block; font-size: 10px; font-weight: 700; padding: 1px 6px; border: 1px solid #000; border-radius: 2px; margin-top: 3px; }
    .bloc-meta { font-size: 11px; color: #000; margin: 6px 0; }
    .bloc-meta div { margin: 1px 0; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    .ligne td { padding: 4px 0; vertical-align: top; }
    .nom { padding-right: 6px; }
    .variante { font-size: 11px; color: #555; }
    .qte-prix { font-size: 11px; color: #555; margin-top: 1px; }
    .supplements { font-size: 10px; color: #444; margin-top: 2px; padding-left: 6px; border-left: 2px solid #ccc; }
    .total { text-align: right; white-space: nowrap; font-weight: 600; }
    .separateur { border-top: 1px dashed #000; margin: 8px 0; }
    .ligne-flex { display: flex; justify-content: space-between; padding: 2px 0; }
    .total-final { font-size: 14px; font-weight: 700; padding: 6px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 6px 0; }
    .footer { text-align: center; font-size: 11px; color: #333; margin-top: 14px; padding-top: 8px; border-top: 1px dashed #000; }
    @media print {
      body { width: auto; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${echapperHtml(boutique.nom)}</h1>
    <div class="meta">${dateStr} · ${heureStr}</div>
    <div class="meta">Ticket n° ${echapperHtml(ticket.numeroTicket)}</div>
    ${contexte.caissier ? `<div class="meta">Caissier : ${echapperHtml(contexte.caissier)}</div>` : ""}
    ${contexte.numeroSession ? `<div class="meta">Session : ${echapperHtml(contexte.numeroSession)}</div>` : ""}
    ${contexte.origineOffline ? `<div class="badge-offline">[OFFLINE]</div>` : ""}
  </div>

  ${blocClientNote}

  <table>
    ${lignesHtml}
  </table>

  <div class="separateur"></div>

  <div class="ligne-flex">
    <span>Sous-total</span>
    <span>${formatMontant(ticket.sousTotal)}</span>
  </div>
  ${
    ticket.montantRemise > 0
      ? `<div class="ligne-flex"><span>Remise</span><span>− ${formatMontant(ticket.montantRemise)}</span></div>`
      : ""
  }
  ${
    ticket.montantTva > 0
      ? `<div class="ligne-flex"><span>TVA</span><span>${formatMontant(ticket.montantTva)}</span></div>`
      : ""
  }

  <div class="total-final ligne-flex">
    <span>TOTAL ${devise}</span>
    <span>${formatMontant(ticket.total)}</span>
  </div>

  ${paiementsHtml}

  ${
    monnaie > 0
      ? `<div class="ligne-flex" style="font-weight:600"><span>Monnaie rendue</span><span>${formatMontant(monnaie)}</span></div>`
      : ""
  }

  <div class="footer">
    Merci de votre visite
  </div>
</body>
</html>`;
}

/**
 * Echappe les caracteres dangereux pour HTML. Fix C4 :
 * - rename `escape` (qui shadowait le global deprecated)
 * - couvre `'` et `` ` `` car le nom client/note pourrait casser un
 *   attribut delimite par apostrophes ou un template inline.
 */
function echapperHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
}
