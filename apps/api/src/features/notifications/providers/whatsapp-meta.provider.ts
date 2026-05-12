import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvoiNotification, NotificationProvider, ResultatEnvoi } from "./notification.provider";

/**
 * Module 10 D1 : provider WhatsApp via Meta Cloud API (Graph API v20+).
 *
 * Doc : https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Pre-requis :
 * - WHATSAPP_TOKEN : token system user (long-lived)
 * - WHATSAPP_PHONE_ID : ID du numero WhatsApp Business (visible dans
 *   le dashboard Meta Business -> WhatsApp -> API Setup)
 *
 * Limites :
 * - Hors fenetre 24h (apres le dernier message du client), seul un
 *   template approuve par Meta peut etre envoye. Pour le MVP, on
 *   envoie en texte libre — fonctionne pour les reponses dans la
 *   fenetre, et pour les numeros qui ont deja ecrit a la boutique.
 * - Pour les rappels J-1 (D3), il faudra des templates approuves.
 * - Numero destinataire au format E.164 sans `+` (ex. 22507123456).
 *
 * Fallback : si WHATSAPP_TOKEN absent, le provider log et retourne
 * succes=true (utile en dev pour ne pas casser les flows applicatifs).
 */
@Injectable()
export class WhatsAppMetaProvider implements NotificationProvider {
  readonly canal = "whatsapp";
  private readonly logger = new Logger(WhatsAppMetaProvider.name);
  private readonly token: string | undefined;
  private readonly phoneId: string | undefined;
  private readonly apiVersion: string;

  constructor(config: ConfigService) {
    this.token = config.get<string>("WHATSAPP_TOKEN");
    this.phoneId = config.get<string>("WHATSAPP_PHONE_ID");
    this.apiVersion = config.get<string>("WHATSAPP_API_VERSION") ?? "v20.0";
  }

  get disponible(): boolean {
    return Boolean(this.token && this.phoneId);
  }

  /**
   * Normalise un numero au format E.164 sans `+` attendu par Meta.
   * Accepte : "+225 07 12 34 56 78", "00225 07...", "0712...", "22507...".
   * Garde uniquement les chiffres et supprime le "00" prefixe.
   */
  static normaliserNumero(numero: string): string | null {
    const seulementChiffres = numero.replace(/\D/g, "");
    if (seulementChiffres.length < 8) return null;
    if (seulementChiffres.startsWith("00")) return seulementChiffres.slice(2);
    return seulementChiffres;
  }

  async envoyer(envoi: EnvoiNotification): Promise<ResultatEnvoi> {
    const numero = WhatsAppMetaProvider.normaliserNumero(envoi.destinataire);
    if (!numero) {
      return { succes: false, erreur: `Numero invalide : ${envoi.destinataire}` };
    }

    if (!this.disponible) {
      // Fallback dev : log et retourne succes pour ne pas casser le flow.
      this.logger.warn(
        `WhatsApp non configure (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID manquants).\n` +
          `Aurait envoye a ${numero}:\n${envoi.texte}`,
      );
      return { succes: true, providerMessageId: `dev:${Date.now()}` };
    }

    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: numero,
          type: "text",
          text: { body: envoi.texte.slice(0, 4096) },
        }),
      });

      if (!response.ok) {
        const erreur = await response.text();
        this.logger.error(`Echec WhatsApp ${response.status} pour ${numero}: ${erreur}`);
        return { succes: false, erreur: `HTTP ${response.status}: ${erreur.slice(0, 500)}` };
      }

      const data = (await response.json()) as {
        messages?: Array<{ id?: string }>;
      };
      const providerMessageId = data.messages?.[0]?.id;
      return { succes: true, providerMessageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Erreur reseau WhatsApp pour ${numero}: ${message}`);
      return { succes: false, erreur: message };
    }
  }
}
