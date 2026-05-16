import { Injectable } from "@nestjs/common";
import { createHmac, randomBytes } from "crypto";

/**
 * Service TOTP (RFC 6238) sans dependance externe.
 *
 * Compatible avec Google Authenticator, Authy, 1Password, Microsoft
 * Authenticator. Utilise HMAC-SHA1 + 6 digits + fenetre de 30 secondes
 * — les valeurs par defaut de l'industrie.
 *
 * Pour le QR Code de provisionning, on retourne l'URL standard
 * otpauth://totp/Issuer:account?secret=BASE32&issuer=Issuer
 * qui peut etre rendue cote client via une lib QR ou un service.
 */
@Injectable()
export class MfaService {
  /** Periode en secondes (standard 30s). */
  private readonly periode = 30;
  /** Nombre de chiffres du code (standard 6). */
  private readonly digits = 6;
  /** Tolerance fenetres avant/apres (1 = +/- 30s, total 90s de validite). */
  private readonly fenetre = 1;

  /**
   * Genere un nouveau secret aleatoire (160 bits = 20 octets, recommande RFC).
   * Retourne en base32 (alphabet RFC 4648, sans padding).
   */
  genererSecret(): string {
    return this.encodeBase32(randomBytes(20));
  }

  /**
   * Construit l'URL otpauth standard a encoder en QR code.
   * Format : otpauth://totp/{Issuer}:{compte}?secret={SECRET}&issuer={Issuer}
   */
  construireUrlProvisionning(secret: string, compte: string, issuer = "LIBITEX"): string {
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: "SHA1",
      digits: String(this.digits),
      period: String(this.periode),
    });
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(compte)}?${params}`;
  }

  /**
   * Verifie qu'un code a 6 chiffres correspond au secret, avec tolerance
   * fenetre +/- 30s pour absorber le decalage d'horloge.
   */
  verifierCode(secret: string, codeFourni: string): boolean {
    const code = codeFourni.replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) return false;

    const secretBytes = this.decodeBase32(secret);
    const compteur = Math.floor(Date.now() / 1000 / this.periode);

    // Verifie la fenetre courante et +/- N pas pour tolerer le drift d'horloge
    for (let delta = -this.fenetre; delta <= this.fenetre; delta++) {
      const codeAttendu = this.genererTotp(secretBytes, compteur + delta);
      // Comparaison en temps constant pour eviter les attaques timing
      if (this.compareTempsConstant(codeAttendu, code)) return true;
    }
    return false;
  }

  /**
   * HOTP (RFC 4226) : HMAC-SHA1(secret, compteur 8 octets big-endian),
   * troncation dynamique sur 4 octets, modulo 10^digits.
   */
  private genererTotp(secret: Buffer, compteur: number): string {
    const buffer = Buffer.alloc(8);
    // Compteur 64 bits big-endian. Le high u32 reste 0 (compteur < 2^32).
    buffer.writeUInt32BE(0, 0);
    buffer.writeUInt32BE(compteur, 4);

    const hmac = createHmac("sha1", secret).update(buffer).digest();
    // Truncation dynamique RFC 4226 sec 5.3
    const offset = hmac[hmac.length - 1]! & 0x0f;
    const code = ((hmac[offset]! & 0x7f) << 24)
      | ((hmac[offset + 1]! & 0xff) << 16)
      | ((hmac[offset + 2]! & 0xff) << 8)
      | (hmac[offset + 3]! & 0xff);

    const modulo = 10 ** this.digits;
    return String(code % modulo).padStart(this.digits, "0");
  }

  private compareTempsConstant(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  /** Encodage Base32 RFC 4648 sans padding. */
  private encodeBase32(buffer: Buffer): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0;
    let valeur = 0;
    let resultat = "";
    for (const octet of buffer) {
      valeur = (valeur << 8) | octet;
      bits += 8;
      while (bits >= 5) {
        resultat += alphabet[(valeur >>> (bits - 5)) & 0x1f];
        bits -= 5;
      }
    }
    if (bits > 0) {
      resultat += alphabet[(valeur << (5 - bits)) & 0x1f];
    }
    return resultat;
  }

  /** Decodage Base32 RFC 4648 (tolere padding et casse). */
  private decodeBase32(secret: string): Buffer {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleaned = secret.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
    let bits = 0;
    let valeur = 0;
    const octets: number[] = [];
    for (const c of cleaned) {
      const idx = alphabet.indexOf(c);
      if (idx === -1) throw new Error(`Caractère Base32 invalide: ${c}`);
      valeur = (valeur << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        octets.push((valeur >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return Buffer.from(octets);
  }
}
