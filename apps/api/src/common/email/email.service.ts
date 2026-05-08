import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

interface EnvoyerOptions {
  destinataire: string;
  sujet: string;
  texte: string;
  html?: string;
}

/**
 * Abstraction d'envoi d'email avec fallback sur les logs si SMTP non configure.
 *
 * En l'absence de SMTP_HOST, on log le contenu du mail (utile en dev,
 * et pour les boutiques qui n'ont pas encore configure l'envoi reel).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly expediteur: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>("SMTP_HOST");
    this.expediteur = this.config.get<string>("SMTP_FROM") ?? "no-reply@libitex.app";

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get<string>("SMTP_PORT") ?? 587),
        secure: this.config.get<string>("SMTP_SECURE") === "true",
        auth: this.config.get<string>("SMTP_USER")
          ? {
              user: this.config.get<string>("SMTP_USER"),
              pass: this.config.get<string>("SMTP_PASS"),
            }
          : undefined,
      });
    } else {
      this.transporter = null;
    }
  }

  async envoyer({ destinataire, sujet, texte, html }: EnvoyerOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP non configure — email non envoye a ${destinataire}.\n` +
          `Sujet: ${sujet}\nContenu:\n${texte}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.expediteur,
        to: destinataire,
        subject: sujet,
        text: texte,
        html,
      });
    } catch (err) {
      // On ne fait pas remonter l'erreur SMTP a l'utilisateur (information leak),
      // mais on log pour diagnostic.
      this.logger.error(
        `Echec envoi email a ${destinataire}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
