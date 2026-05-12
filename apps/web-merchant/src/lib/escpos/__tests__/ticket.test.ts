import { describe, expect, it } from "bun:test";
import type { ITicket } from "@/features/vente/types/vente.type";
import { ESC, GS, LF } from "../builder";
import { genererTicketEscPos } from "../ticket";

function ticketBase(): ITicket {
  return {
    id: "t1",
    numeroTicket: "T-001",
    statut: "COMPLETED",
    sousTotal: 1500,
    montantTva: 0,
    montantRemise: 0,
    total: 1500,
    completeLe: "2026-05-12T10:30:00.000Z",
    creeLe: "2026-05-12T10:30:00.000Z",
    lignes: [
      {
        id: "l1",
        varianteId: "v1",
        nomProduit: "Cafe",
        nomVariante: null,
        sku: "CAF-001",
        quantite: 1,
        prixUnitaire: 1500,
        remise: 0,
        tauxTva: 0,
        montantTva: 0,
        totalLigne: 1500,
        supplements: [],
      },
    ],
    paiements: [{ id: "p1", methode: "CASH", montant: 2000 }],
  };
}

function asString(bytes: Uint8Array): string {
  // Decode en latin1 pour pouvoir grep facilement le contenu (les octets
  // CP858 hors ASCII apparaissent comme des chars latin1, pas l'enjeu ici).
  return String.fromCharCode(...bytes);
}

describe("genererTicketEscPos", () => {
  it("commence par init + selection CP858", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy" }, 0, {});
    expect(out[0]).toBe(ESC);
    expect(out[1]).toBe(0x40);     // init
    expect(out[2]).toBe(ESC);
    expect(out[3]).toBe(0x74);     // selection table
    expect(out[4]).toBe(19);       // CP858
  });

  it("se termine par GS V 0x42 0x00 (coupe)", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy" }, 0, {});
    const n = out.length;
    expect(out[n - 4]).toBe(GS);
    expect(out[n - 3]).toBe(0x56);
    expect(out[n - 2]).toBe(0x42);
    expect(out[n - 1]).toBe(0x00);
  });

  it("contient le numero de ticket", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy" }, 0, {});
    expect(asString(out)).toContain("Ticket T-001");
  });

  it("imprime le total avec sa valeur formatee", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy" }, 0, {});
    expect(asString(out)).toContain("TOTAL");
    // 1500 -> "1 500" (format francais avec espace insecable, mappe sur espace simple)
    expect(asString(out)).toMatch(/1.500/);
  });

  it("inclut le caissier quand fourni", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy" }, 0, { caissier: "Anderson K." });
    expect(asString(out)).toContain("Caissier : Anderson K.");
  });

  it("inclut la session quand fournie", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy" }, 0, { numeroSession: "SC-20260512-001" });
    expect(asString(out)).toContain("Session : SC-20260512-001");
  });

  it("imprime [OFFLINE] quand origineOffline=true", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy" }, 0, { origineOffline: true });
    expect(asString(out)).toContain("[OFFLINE]");
  });

  it("n'imprime PAS [OFFLINE] sans origineOffline", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy" }, 0, {});
    expect(asString(out)).not.toContain("[OFFLINE]");
  });

  it("imprime le bloc client quand nomClient est present", () => {
    const t = { ...ticketBase(), nomClient: "Marie Dupont", telephoneClient: "+225 0708090201" };
    const out = genererTicketEscPos(t, { nom: "Andy" }, 0, {});
    expect(asString(out)).toContain("Client : Marie Dupont");
  });

  it("imprime la note quand presente", () => {
    const t = { ...ticketBase(), note: "Table 3 - Sans piment" };
    const out = genererTicketEscPos(t, { nom: "Andy" }, 0, {});
    expect(asString(out)).toContain("Note : Table 3 - Sans piment");
  });

  it("imprime 'Monnaie rendue' quand monnaie > 0", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy" }, 500, {});
    expect(asString(out)).toContain("Monnaie rendue");
  });

  it("n'imprime PAS 'Monnaie rendue' quand monnaie = 0", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy" }, 0, {});
    expect(asString(out)).not.toContain("Monnaie rendue");
  });

  it("traduit CASH en 'Especes' via LABELS_METHODE_PAIEMENT", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy" }, 0, {});
    // CP858: 'è' = 0x8a, donc "Esp(0x8a)ces" en latin1 -> string.match va capturer Esp.ces
    const s = asString(out);
    expect(s).toMatch(/Esp.ces/);
  });

  it("traduit LOYALTY en 'Points fidelite'", () => {
    const t = { ...ticketBase(), paiements: [{ id: "p", methode: "LOYALTY", montant: 1500 }] };
    const out = genererTicketEscPos(t, { nom: "Andy" }, 0, {});
    expect(asString(out)).toContain("Points fidelite");
  });

  it("affiche TVA si montant > 0", () => {
    const t = { ...ticketBase(), montantTva: 180 };
    const out = genererTicketEscPos(t, { nom: "Andy" }, 0, {});
    expect(asString(out)).toContain("TVA");
  });

  it("affiche Remise si montant > 0", () => {
    const t = { ...ticketBase(), montantRemise: 200 };
    const out = genererTicketEscPos(t, { nom: "Andy" }, 0, {});
    expect(asString(out)).toContain("Remise");
  });

  it("imprime tous les supplements de chaque ligne", () => {
    const t = ticketBase();
    t.lignes[0]!.supplements = [
      { supplementId: "s1", nom: "Sucre", prixUnitaire: 0, quantite: 2 },
      { supplementId: "s2", nom: "Lait", prixUnitaire: 100, quantite: 1 },
    ];
    const out = genererTicketEscPos(t, { nom: "Andy" }, 0, {});
    const s = asString(out);
    expect(s).toContain("+ Sucre");
    expect(s).toContain("+ Lait");
  });

  it("imprime le pied 'Merci de votre visite'", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy" }, 0, {});
    expect(asString(out)).toContain("Merci de votre visite");
  });

  it("respecte la devise personnalisee", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy", devise: "MAD" }, 0, {});
    expect(asString(out)).toContain("MAD");
  });

  it("retourne un Uint8Array", () => {
    const out = genererTicketEscPos(ticketBase(), { nom: "Andy" }, 0, {});
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBeGreaterThan(100);
  });
});
