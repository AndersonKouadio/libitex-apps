/**
 * Module 10 D1 : templates centralises FR pour notifications WhatsApp et
 * email. Garder le texte court, lisible sur mobile, sans markdown
 * complexe (WhatsApp ne fait que *gras* / _italique_).
 *
 * Conventions :
 * - 1ere ligne : verbe + sujet, lisible des l'apercu
 * - emojis : non (cf. CLAUDE.md "pas d'emoji dans l'UI")
 * - montants : separateur 1 000 + suffixe FCFA
 * - signature : "- LIBITEX" optionnelle, ajoutee par le service global
 */

function formatMontant(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function formatDateHeure(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("fr-FR", {
    weekday: "long", day: "2-digit", month: "long",
    hour: "2-digit", minute: "2-digit",
  });
}

export const TEMPLATES_FR = {
  ticket: (params: { nomClient: string; numeroTicket: string; total: number; nomBoutique: string }) =>
    `Bonjour ${params.nomClient}, merci pour votre achat chez ${params.nomBoutique}.\n\n` +
    `Ticket : ${params.numeroTicket}\n` +
    `Total : ${formatMontant(params.total)} FCFA\n\n` +
    `Bonne journee.`,

  reservationCreated: (params: {
    nomClient: string; dateHeure: string | Date; nombrePersonnes: number;
    numeroTable?: string | null; nomBoutique: string;
  }) =>
    `Bonjour ${params.nomClient},\n\n` +
    `Votre reservation chez ${params.nomBoutique} est enregistree.\n\n` +
    `Date : ${formatDateHeure(params.dateHeure)}\n` +
    `Couverts : ${params.nombrePersonnes}\n` +
    (params.numeroTable ? `Table : ${params.numeroTable}\n` : "") +
    `\nA bientot.`,

  reservationReminder: (params: {
    nomClient: string; dateHeure: string | Date; nombrePersonnes: number;
    numeroTable?: string | null; nomBoutique: string;
  }) =>
    `Bonjour ${params.nomClient}, petit rappel :\n\n` +
    `Vous etes attendu(e) demain chez ${params.nomBoutique}.\n` +
    `${formatDateHeure(params.dateHeure)}\n` +
    `${params.nombrePersonnes} couvert${params.nombrePersonnes > 1 ? "s" : ""}\n` +
    (params.numeroTable ? `Table ${params.numeroTable}\n` : "") +
    `\nPour modifier, contactez-nous.`,

  reservationStatusChanged: (params: {
    nomClient: string; statut: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "SEATED" | "NO_SHOW" | "PENDING";
    dateHeure: string | Date; nomBoutique: string;
  }) => {
    const LIBELLES: Record<string, string> = {
      CONFIRMED: "confirmee",
      CANCELLED: "annulee",
      COMPLETED: "terminee",
      SEATED: "vous etes attendu(e) a votre table",
      NO_SHOW: "marquee comme non honoree",
      PENDING: "en attente",
    };
    return (
      `Bonjour ${params.nomClient},\n\n` +
      `Votre reservation chez ${params.nomBoutique} pour le ${formatDateHeure(params.dateHeure)} ` +
      `est ${LIBELLES[params.statut] ?? params.statut.toLowerCase()}.`
    );
  },

  purchaseOrder: (params: {
    nomFournisseur: string; numeroCommande: string; nombreLignes: number;
    montantTotal: number; nomBoutique: string;
  }) =>
    `Bonjour ${params.nomFournisseur},\n\n` +
    `${params.nomBoutique} vous transmet un bon de commande.\n\n` +
    `N° : ${params.numeroCommande}\n` +
    `${params.nombreLignes} ligne${params.nombreLignes > 1 ? "s" : ""}\n` +
    `Total : ${formatMontant(params.montantTotal)} FCFA\n\n` +
    `Pour le detail, demandez le PDF par retour.`,

  promo: (params: {
    nomClient: string; codePromo: string; libelle: string; nomBoutique: string;
    expireLe?: string | Date | null;
  }) =>
    `Bonjour ${params.nomClient},\n\n` +
    `${params.nomBoutique} vous offre une promo : ${params.libelle}.\n` +
    `Code : ${params.codePromo}\n` +
    (params.expireLe ? `Valable jusqu'au ${formatDateHeure(params.expireLe)}.\n` : "") +
    `\nA utiliser en caisse.`,

  stockAlert: (params: { nomBoutique: string; references: string[] }) =>
    `Alerte stock ${params.nomBoutique}\n\n` +
    `${params.references.length} reference${params.references.length > 1 ? "s" : ""} sous le seuil :\n` +
    params.references.slice(0, 5).map((r) => `- ${r}`).join("\n") +
    (params.references.length > 5 ? `\n... +${params.references.length - 5} autres` : ""),

  otp: (params: { code: string; ttlMinutes: number }) =>
    `Votre code de verification LIBITEX : ${params.code}\n` +
    `Valable ${params.ttlMinutes} minutes. Ne le partagez pas.`,
};

/**
 * Helper : exports les helpers de format pour usage dans les tests
 * et services qui veulent formater des montants/dates de la meme facon.
 */
export const formaters = { formatMontant, formatDateHeure };
