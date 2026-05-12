import { describe, expect, it } from "bun:test";
import {
  LIBELLE_TYPE_FIDELITE,
  CLASSES_TYPE_FIDELITE,
  libelleTypeFidelite,
} from "../libelles";

describe("LIBELLE_TYPE_FIDELITE", () => {
  it("expose un libelle francais pour chaque type", () => {
    expect(LIBELLE_TYPE_FIDELITE.EARN).toBe("Gagne");
    expect(LIBELLE_TYPE_FIDELITE.REDEEM).toBe("Utilise");
    expect(LIBELLE_TYPE_FIDELITE.ADJUST).toBe("Ajustement");
  });

  it("expose les 3 cles attendues", () => {
    expect(Object.keys(LIBELLE_TYPE_FIDELITE).sort()).toEqual(["ADJUST", "EARN", "REDEEM"]);
  });
});

describe("CLASSES_TYPE_FIDELITE", () => {
  it("EARN est en text-success (positif)", () => {
    expect(CLASSES_TYPE_FIDELITE.EARN).toBe("text-success");
  });

  it("REDEEM est en text-danger (debit)", () => {
    expect(CLASSES_TYPE_FIDELITE.REDEEM).toBe("text-danger");
  });

  it("ADJUST est en text-muted (neutre)", () => {
    expect(CLASSES_TYPE_FIDELITE.ADJUST).toBe("text-muted");
  });
});

describe("libelleTypeFidelite", () => {
  it("retourne le libelle pour un type connu", () => {
    expect(libelleTypeFidelite("EARN")).toBe("Gagne");
  });

  it("retourne la cle brute pour un type inconnu (defense)", () => {
    expect(libelleTypeFidelite("EXPIRY")).toBe("EXPIRY");
  });
});
