import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Exception metier — erreurs de logique business.
 * Distincte des erreurs techniques (DB down, timeout, etc.)
 */
export class MetierException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly code?: string,
  ) {
    super({ success: false, error: message, code }, status);
  }
}

export class RessourceIntrouvableException extends MetierException {
  constructor(ressource: string, id?: string) {
    const msg = id
      ? `${ressource} introuvable (${id})`
      : `${ressource} introuvable`;
    super(msg, HttpStatus.NOT_FOUND, "RESSOURCE_INTROUVABLE");
  }
}

export class StockInsuffisantException extends MetierException {
  constructor(disponible: number, demande: number) {
    super(
      `Stock insuffisant : ${disponible} disponible(s), ${demande} demande(s)`,
      HttpStatus.CONFLICT,
      "STOCK_INSUFFISANT",
    );
  }
}

export class PaiementInsuffisantException extends MetierException {
  constructor(paye: number, total: number) {
    super(
      `Paiement insuffisant : ${paye} paye, ${total} requis`,
      HttpStatus.PAYMENT_REQUIRED,
      "PAIEMENT_INSUFFISANT",
    );
  }
}

export class NumeroSerieObligatoireException extends MetierException {
  constructor(produit: string) {
    super(
      `Numéro de serie obligatoire pour "${produit}" (produit serialise)`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      "NUMERO_SERIE_OBLIGATOIRE",
    );
  }
}

export class LotIndisponibleException extends MetierException {
  constructor(produit: string) {
    super(
      `Aucun lot disponible pour "${produit}" (produit périssable)`,
      HttpStatus.CONFLICT,
      "LOT_INDISPONIBLE",
    );
  }
}

export class IdentifiantsInvalidesException extends MetierException {
  constructor() {
    super("Email ou mot de passe incorrect", HttpStatus.UNAUTHORIZED, "IDENTIFIANTS_INVALIDES");
  }
}

export class EmailDejaUtiliseException extends MetierException {
  constructor() {
    super("Cette adresse email est déjà utilisee", HttpStatus.CONFLICT, "EMAIL_DEJA_UTILISE");
  }
}

export class SlugDejaUtiliseException extends MetierException {
  constructor() {
    super("Ce nom de boutique est déjà pris", HttpStatus.CONFLICT, "SLUG_DEJA_UTILISE");
  }
}

export class TicketNonModifiableException extends MetierException {
  constructor(statut: string) {
    super(
      `Ce ticket est ${statut}, il ne peut plus etre modifie`,
      HttpStatus.CONFLICT,
      "TICKET_NON_MODIFIABLE",
    );
  }
}
