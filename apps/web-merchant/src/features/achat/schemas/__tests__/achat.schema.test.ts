import { describe, expect, it } from "bun:test";
import { fournisseurSchema, commandeSchema, receptionSchema } from "../achat.schema";

/**
 * Tests sur les schemas Zod du module achats. Couvrent les regles de
 * validation cote front qui evitent les payloads invalides (et donc
 * les toasts d'erreur frustrants).
 */

const UUID = "00000000-0000-4000-8000-000000000001";

describe("fournisseurSchema", () => {
  it("valide un fournisseur minimal (nom seulement)", () => {
    const r = fournisseurSchema.safeParse({ nom: "Ets ABC" });
    expect(r.success).toBe(true);
  });

  it("rejette un nom vide", () => {
    const r = fournisseurSchema.safeParse({ nom: "" });
    expect(r.success).toBe(false);
  });

  it("rejette un nom > 255 caracteres", () => {
    const r = fournisseurSchema.safeParse({ nom: "a".repeat(256) });
    expect(r.success).toBe(false);
  });

  it("rejette un email invalide", () => {
    const r = fournisseurSchema.safeParse({ nom: "Ets", email: "pas-un-email" });
    expect(r.success).toBe(false);
  });

  it("accepte un email vide (chaine vide convertie)", () => {
    const r = fournisseurSchema.safeParse({ nom: "Ets", email: "" });
    expect(r.success).toBe(true);
  });

  it("accepte un email valide", () => {
    const r = fournisseurSchema.safeParse({ nom: "Ets", email: "contact@ets.ci" });
    expect(r.success).toBe(true);
  });

  it("rejette des notes > 500 caracteres (fix m6)", () => {
    const r = fournisseurSchema.safeParse({ nom: "Ets", notes: "x".repeat(501) });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]!.message).toContain("500");
  });

  it("accepte des notes exactement a 500 caracteres", () => {
    const r = fournisseurSchema.safeParse({ nom: "Ets", notes: "x".repeat(500) });
    expect(r.success).toBe(true);
  });
});

describe("commandeSchema", () => {
  const base = {
    fournisseurId: UUID,
    emplacementId: UUID,
    lignes: [{ varianteId: UUID, quantite: 1, prixUnitaire: 100 }],
  };

  it("valide une commande minimale", () => {
    const r = commandeSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("rejette un fournisseurId non-UUID", () => {
    const r = commandeSchema.safeParse({ ...base, fournisseurId: "pas-uuid" });
    expect(r.success).toBe(false);
  });

  it("rejette une commande sans lignes", () => {
    const r = commandeSchema.safeParse({ ...base, lignes: [] });
    expect(r.success).toBe(false);
  });

  it("rejette une quantite negative", () => {
    const r = commandeSchema.safeParse({
      ...base,
      lignes: [{ varianteId: UUID, quantite: -1, prixUnitaire: 100 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejette un prix negatif", () => {
    const r = commandeSchema.safeParse({
      ...base,
      lignes: [{ varianteId: UUID, quantite: 1, prixUnitaire: -1 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejette une dateAttendue dans le passe (fix m5)", () => {
    const hier = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const r = commandeSchema.safeParse({ ...base, dateAttendue: hier });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]!.message).toContain("passe");
  });

  it("accepte une dateAttendue aujourd'hui", () => {
    const aujourdhui = new Date().toISOString().split("T")[0];
    const r = commandeSchema.safeParse({ ...base, dateAttendue: aujourdhui });
    expect(r.success).toBe(true);
  });

  it("accepte une dateAttendue future", () => {
    const demain = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const r = commandeSchema.safeParse({ ...base, dateAttendue: demain });
    expect(r.success).toBe(true);
  });

  it("accepte une dateAttendue absente (optionnelle)", () => {
    const r = commandeSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("rejette des notes > 500 caracteres (fix m6)", () => {
    const r = commandeSchema.safeParse({ ...base, notes: "x".repeat(501) });
    expect(r.success).toBe(false);
  });
});

describe("receptionSchema", () => {
  it("valide une reception minimale", () => {
    const r = receptionSchema.safeParse({
      lignes: [{ ligneId: UUID, quantite: 5 }],
    });
    expect(r.success).toBe(true);
  });

  it("accepte majPrixAchat optionnel", () => {
    const r = receptionSchema.safeParse({
      lignes: [{ ligneId: UUID, quantite: 5 }],
      majPrixAchat: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejette une quantite negative", () => {
    const r = receptionSchema.safeParse({
      lignes: [{ ligneId: UUID, quantite: -1 }],
    });
    expect(r.success).toBe(false);
  });

  it("accepte une quantite a 0 (skippee dans le service)", () => {
    const r = receptionSchema.safeParse({
      lignes: [{ ligneId: UUID, quantite: 0 }],
    });
    expect(r.success).toBe(true);
  });
});
