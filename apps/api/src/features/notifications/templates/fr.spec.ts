import { TEMPLATES_FR, formaters } from "./fr";

describe("Templates notifications FR", () => {
  describe("formatMontant", () => {
    it("formate avec separateur de milliers FR", () => {
      // Intl utilise NBSP ( ) ou narrow NBSP ( ) en FR
      const result = formaters.formatMontant(150000);
      expect(result.replace(/\s/g, "")).toBe("150000");
    });

    it("arrondit les decimales", () => {
      expect(formaters.formatMontant(1234.7)).toMatch(/^1[\s  ]235$/);
    });

    it("gere 0", () => {
      expect(formaters.formatMontant(0)).toBe("0");
    });
  });

  describe("ticket template", () => {
    it("contient nom client, numero, total, boutique", () => {
      const t = TEMPLATES_FR.ticket({
        nomClient: "Aminata",
        numeroTicket: "T-001234",
        total: 25000,
        nomBoutique: "Chez Mami",
      });
      expect(t).toContain("Aminata");
      expect(t).toContain("T-001234");
      expect(t).toContain("FCFA");
      expect(t).toContain("Chez Mami");
      expect(t).toMatch(/25[\s  ]000/);
    });

    it("reste sous 4096 caracteres (limite WhatsApp)", () => {
      const t = TEMPLATES_FR.ticket({
        nomClient: "A".repeat(100),
        numeroTicket: "T-001234",
        total: 999_999_999,
        nomBoutique: "B".repeat(100),
      });
      expect(t.length).toBeLessThan(4096);
    });
  });

  describe("reservationCreated template", () => {
    it("contient nom, date, couverts, table optionnelle", () => {
      const t = TEMPLATES_FR.reservationCreated({
        nomClient: "Jean",
        dateHeure: new Date("2026-06-15T20:00:00"),
        nombrePersonnes: 4,
        numeroTable: "12",
        nomBoutique: "Le Resto",
      });
      expect(t).toContain("Jean");
      expect(t).toContain("Le Resto");
      expect(t).toContain("4");
      expect(t).toContain("12");
    });

    it("omet la ligne table si numero null", () => {
      const t = TEMPLATES_FR.reservationCreated({
        nomClient: "Jean",
        dateHeure: new Date("2026-06-15T20:00:00"),
        nombrePersonnes: 2,
        numeroTable: null,
        nomBoutique: "Resto",
      });
      expect(t).not.toContain("Table :");
    });
  });

  describe("reservationStatusChanged template", () => {
    it("traduit le statut en francais", () => {
      const t = TEMPLATES_FR.reservationStatusChanged({
        nomClient: "Marie",
        statut: "CANCELLED",
        dateHeure: new Date("2026-06-15T20:00:00"),
        nomBoutique: "Resto",
      });
      expect(t).toContain("annulee");
      expect(t).not.toContain("CANCELLED");
    });
  });

  describe("purchaseOrder template", () => {
    it("contient numero, lignes, total", () => {
      const t = TEMPLATES_FR.purchaseOrder({
        nomFournisseur: "Fournisseur SARL",
        numeroCommande: "BC-2026-001",
        nombreLignes: 5,
        montantTotal: 450000,
        nomBoutique: "Ma Boutique",
      });
      expect(t).toContain("BC-2026-001");
      expect(t).toContain("5 lignes");
      expect(t).toContain("Fournisseur SARL");
      expect(t).toMatch(/450[\s  ]000/);
    });

    it("singularise au singulier", () => {
      const t = TEMPLATES_FR.purchaseOrder({
        nomFournisseur: "X",
        numeroCommande: "BC-1",
        nombreLignes: 1,
        montantTotal: 1000,
        nomBoutique: "Y",
      });
      expect(t).toContain("1 ligne\n");
    });
  });

  describe("otp template", () => {
    it("contient code et duree de validite", () => {
      const t = TEMPLATES_FR.otp({ code: "123456", ttlMinutes: 5 });
      expect(t).toContain("123456");
      expect(t).toContain("5 minutes");
      expect(t).toContain("LIBITEX");
    });
  });

  describe("stockAlert template", () => {
    it("liste max 5 references et indique le surplus", () => {
      const t = TEMPLATES_FR.stockAlert({
        nomBoutique: "Resto",
        references: ["A", "B", "C", "D", "E", "F", "G"],
      });
      expect(t).toContain("- A");
      expect(t).toContain("- E");
      expect(t).not.toContain("- F"); // truncate apres 5
      expect(t).toContain("+2 autres");
    });
  });
});
