/**
 * Module 10 D1 : abstraction provider de notifications. Permet de switcher
 * entre Meta Cloud API, Twilio, ou un mock log-only sans toucher le code
 * applicatif. Chaque provider implemente cette interface.
 */
export interface EnvoiNotification {
  /** Destinataire (telephone E.164 pour WhatsApp/SMS, email pour mail). */
  destinataire: string;
  /** Corps du message (texte brut, < 4096 caracteres pour WhatsApp). */
  texte: string;
  /** Sujet (email uniquement). Ignore pour WhatsApp/SMS. */
  sujet?: string;
  /** Variant HTML pour email. */
  html?: string;
}

export interface ResultatEnvoi {
  /** true si l'envoi a ete accepte par le provider. Ne garantit pas la
   *  livraison (webhook delivered/read confirme plus tard). */
  succes: boolean;
  /** ID retourne par le provider, a stocker pour correlation webhook. */
  providerMessageId?: string;
  /** Message d'erreur si succes=false. */
  erreur?: string;
}

/**
 * Provider de notifications. Implementations :
 * - WhatsAppMetaProvider : Meta Cloud API (Graph API)
 * - WhatsAppTwilioProvider : Twilio WhatsApp (sandbox + prod)
 * - EmailProvider : nodemailer (existant, wrap)
 * - NoopProvider : log-only, pour dev sans config
 */
export interface NotificationProvider {
  /** Identifiant canal pour les logs : 'whatsapp' | 'email' | 'sms'. */
  readonly canal: string;
  /** true si le provider est configure et pret a envoyer. */
  readonly disponible: boolean;
  envoyer(envoi: EnvoiNotification): Promise<ResultatEnvoi>;
}
